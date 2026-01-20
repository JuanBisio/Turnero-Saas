const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nyoodvdlrrkgibjbxmgj.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('Checking schema for webhook_logs...')
  
  // Trick to get column names: SELECT * FROM ... LIMIT 0 (but Supabase JS client doesn't expose columns easily in metadata)
  // We'll rely on the error or data structure if we can insert something dummy, OR just try to select
  
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error selecting from webhook_logs:', error)
  } else {
    console.log('Successfully selected from webhook_logs.')
    if (data.length > 0) {
      console.log('Sample row keys:', Object.keys(data[0]))
    } else {
      console.log('Table is empty, cannot infer columns from data.')
    }
  }
}

checkSchema()
