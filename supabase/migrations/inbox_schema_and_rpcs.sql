-- 1. Inbox Contacts Table
CREATE TABLE IF NOT EXISTS public.inbox_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE, -- Optional multitenancy support
    phone TEXT NOT NULL,
    name TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shop_id, phone)
);

-- Index for fast lookup by phone
CREATE INDEX IF NOT EXISTS idx_inbox_contacts_phone ON public.inbox_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_inbox_contacts_shop_id ON public.inbox_contacts(shop_id);

-- 2. Inbox Messages Table
CREATE TABLE IF NOT EXISTS public.inbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.inbox_contacts(id) ON DELETE CASCADE,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    type TEXT DEFAULT 'text',
    content TEXT,
    y_message_id TEXT, -- YCloud Message ID
    status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching chat history
CREATE INDEX IF NOT EXISTS idx_inbox_messages_contact_id ON public.inbox_messages(contact_id);

-- 3. RLS - Enable Security (Simple for now, can be tightened later)
ALTER TABLE public.inbox_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.inbox_contacts
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON public.inbox_messages
FOR ALL USING (true) WITH CHECK (true);

-- 4. RPC: Handle Inbound Message (Upsert Contact + Insert Message)
CREATE OR REPLACE FUNCTION handle_inbound_message(
    p_phone TEXT,
    p_name TEXT,
    p_content TEXT,
    p_y_id TEXT,
    p_shop_slug TEXT DEFAULT 'demo'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shop_id UUID;
    v_contact_id UUID;
BEGIN
    -- Get Shop ID
    SELECT id INTO v_shop_id FROM shops WHERE slug = p_shop_slug LIMIT 1;
    IF v_shop_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Shop not found');
    END IF;

    -- Upsert Contact
    INSERT INTO inbox_contacts (shop_id, phone, name, last_message_at, unread_count)
    VALUES (v_shop_id, p_phone, p_name, NOW(), 1)
    ON CONFLICT (shop_id, phone)
    DO UPDATE SET
        last_message_at = NOW(),
        name = COALESCE(EXCLUDED.name, inbox_contacts.name),
        unread_count = inbox_contacts.unread_count + 1
    RETURNING id INTO v_contact_id;

    -- Insert Message
    INSERT INTO inbox_messages (contact_id, direction, content, y_message_id, status)
    VALUES (v_contact_id, 'inbound', p_content, p_y_id, 'delivered');

    RETURN json_build_object('success', true, 'contact_id', v_contact_id);
END;
$$;

-- 5. RPC: Handle Outbound Message (Insert Message + Update Contact)
CREATE OR REPLACE FUNCTION handle_outbound_message(
    p_contact_id UUID,
    p_content TEXT,
    p_y_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert Message
    INSERT INTO inbox_messages (contact_id, direction, content, y_message_id, status)
    VALUES (p_contact_id, 'outbound', p_content, p_y_id, 'sent');

    -- Update Contact (Last message time, but DO NOT increment unread for outbound)
    UPDATE inbox_contacts 
    SET last_message_at = NOW() 
    WHERE id = p_contact_id;

    RETURN json_build_object('success', true);
END;
$$;
