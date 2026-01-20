const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nyoodvdlrrkgibjbxmgj.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLogs() {
  console.log('Checking webhook_logs for recent entries...')
  
  const { data: logs, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching logs:', error)
  } else {
    console.log('Recent Webhook Logs:', JSON.stringify(logs, null, 2))
    
    if (logs.length > 0) {
      console.log('\n--- Analysis ---')
      logs.forEach(log => {
        console.log(`ID: ${log.id}`)
        console.log(`Status: ${log.status}`)
        console.log(`Error Message: ${log.error_message}`)
        console.log(`Response Body: ${log.response_body}`)
        console.log('----------------')
      })
    } else {
      console.log('No logs found. Did the trigger fire?')
    }
  }
}

checkLogs()
