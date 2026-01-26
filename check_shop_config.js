
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nyoodvdlrrkgibjbxmgj.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55b29kdmRscnJrZ2liamJ4bWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg3NTM4MSwiZXhwIjoyMDg0NDUxMzgxfQ.RfOeiMCJ2YZVjUe13RVPzEaHEWBcayPh0bCoMkJJoJM'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkShopWebhooks() {
  console.log('🕵️‍♀️ Checking Shop Webhook Settings')
  console.log('================================================')

  const { data, error } = await supabase
    .from('shops')
    .select('id, name, webhook_url, webhook_enabled')

  if (error) {
    console.error('❌ Error fetching shops:', error)
    return
  }

  data.forEach(shop => {
    console.log(`🏪 Shop: ${shop.name} (${shop.id})`)
    console.log(`   Enabled: ${shop.webhook_enabled}`)
    console.log(`   URL: ${shop.webhook_url}`)
    console.log('------------------------------------------------')
  })
}

checkShopWebhooks()
