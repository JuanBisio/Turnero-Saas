
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nyoodvdlrrkgibjbxmgj.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55b29kdmRscnJrZ2liamJ4bWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg3NTM4MSwiZXhwIjoyMDg0NDUxMzgxfQ.RfOeiMCJ2YZVjUe13RVPzEaHEWBcayPh0bCoMkJJoJM'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkWebhookLogs() {
  console.log('🕵️‍♀️ Checking Webhook Logs (Last 5 entries)')
  console.log('================================================')

  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error fetching logs:', error)
    return
  }

  if (data.length === 0) {
    console.log('⚠️ No webhook logs found.')
  } else {
    data.forEach(log => {
      console.log(`[${new Date(log.created_at).toLocaleString()}] Status: ${log.status_code} | Success: ${log.success}`)
      console.log(`   URL: ${log.url}`)
      console.log(`   Error: ${log.error_message || 'None'}`)
      console.log('------------------------------------------------')
    })
  }
}

checkWebhookLogs()
