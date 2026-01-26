
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nyoodvdlrrkgibjbxmgj.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55b29kdmRscnJrZ2liamJ4bWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg3NTM4MSwiZXhwIjoyMDg0NDUxMzgxfQ.RfOeiMCJ2YZVjUe13RVPzEaHEWBcayPh0bCoMkJJoJM'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function debugState() {
  console.log('🕵️‍♀️ DEBUG: Curent State Investigation')
  console.log('================================================')

  // 1. Get latest appointment
  const { data: appts, error: apptError } = await supabase
    .from('appointments')
    .select('id, created_at, customer_name, customer_phone')
    .order('created_at', { ascending: false })
    .limit(1)

  if (apptError) console.error('❌ Error getting appt:', apptError)
  else if (appts.length === 0) console.log('⚠️ No appointments found.')
  else {
    const appt = appts[0]
    console.log(`📅 Latest Appt: ${appt.customer_name} (${appt.customer_phone})`)
    console.log(`   ID: ${appt.id}`)
    console.log(`   Created: ${new Date(appt.created_at).toLocaleString()}`)
  }

  console.log('------------------------------------------------')

  // 2. Check Webhook Logs (Last 5)
  const { data: logs, error: logError } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (logError) console.error('❌ Error getting logs:', logError)
  else if (logs.length === 0) console.log('⚠️ No webhook logs found.')
  else {
    logs.forEach(log => {
      console.log(`📝 Log [${new Date(log.created_at).toLocaleString()}]`)
      console.log(`   Event: ${log.event_type || 'N/A'}`)
      console.log(`   URL: ${log.url}`)
      console.log(`   Status: ${log.status_code} | Success: ${log.success}`)
      console.log(`   Error: ${log.error_message || 'None'}`)
      console.log('------------------------------------------------')
    })
  }
}

debugState()
