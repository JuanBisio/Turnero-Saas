import { createClient } from "@supabase/supabase-js";
import { WhatsappSession } from "@/types/whatsapp-session";

/**
 * Gestiona la persistencia de sesiones de WhatsApp en Supabase.
 * Usa RPCs para CRUD atómico de estados.
 */

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getOrCreateSession(phone: string): Promise<WhatsappSession> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("get_or_create_session", { p_phone: phone });
  
  if (error) {
    console.error("[Session] Error get_or_create:", error.message);
    throw new Error(`[Session] get: ${error.message}`);
  }
  
  const raw = Array.isArray(data) ? data[0] : data;
  
  return {
    current_state: raw?.current_state ?? "IDLE",
    intent: raw?.intent || null,
    service: raw?.service || null,
    professional: raw?.professional || null,
    preferred_date: raw?.preferred_date || null,
    preferred_time: raw?.preferred_time || null,
  };
}

export async function updateSession(
  phone: string,
  session: WhatsappSession
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.rpc("update_session", {
    p_phone: phone,
    p_current_state: session.current_state,
    p_intent: session.intent ?? null,
    p_service: session.service ?? null,
    p_professional: session.professional ?? null,
    p_preferred_date: session.preferred_date ?? null,   // null, no "": DATE no acepta string vacío
    p_preferred_time: session.preferred_time ?? null,   // null, no "": TIME no acepta string vacío
  });
  
  if (error) {
    console.error(`[Session] Error update (${phone}):`, error.message);
  }
}

export async function resetSession(phone: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.rpc("reset_session", { p_phone: phone });

  if (error) {
    console.error(`[Session] Error reset (${phone}):`, error.message);
  }
}

// ── Funciones shop-aware (multi-tenant) ───────────────────────────────────────

export async function getOrCreateSessionForShop(
  phone: string,
  shopSlug: string
): Promise<WhatsappSession> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("get_or_create_session_for_shop", {
    p_phone: phone,
    p_shop_slug: shopSlug,
  });

  if (error) {
    console.error(`[Session] Error get_or_create_for_shop (${shopSlug}):`, error.message);
    throw new Error(`[Session] get: ${error.message}`);
  }

  const raw = Array.isArray(data) ? data[0] : data;

  return {
    current_state: raw?.current_state ?? "IDLE",
    intent: raw?.intent || null,
    service: raw?.service || null,
    professional: raw?.professional || null,
    preferred_date: raw?.preferred_date || null,
    preferred_time: raw?.preferred_time || null,
  };
}

export async function updateSessionForShop(
  phone: string,
  shopSlug: string,
  session: WhatsappSession
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.rpc("update_session_for_shop", {
    p_phone: phone,
    p_shop_slug: shopSlug,
    p_current_state: session.current_state,
    p_intent: session.intent ?? null,
    p_service: session.service ?? null,
    p_professional: session.professional ?? null,
    p_preferred_date: session.preferred_date ?? null,
    p_preferred_time: session.preferred_time ?? null,
  });

  if (error) {
    console.error(`[Session] Error update_for_shop (${shopSlug}/${phone}):`, error.message);
  }
}

export async function resetSessionForShop(
  phone: string,
  shopSlug: string
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.rpc("reset_session_for_shop", {
    p_phone: phone,
    p_shop_slug: shopSlug,
  });

  if (error) {
    console.error(`[Session] Error reset_for_shop (${shopSlug}/${phone}):`, error.message);
  }
}
