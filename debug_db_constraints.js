
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nyoodvdlrrkgibjbxmgj.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55b29kdmRscnJrZ2liamJ4bWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg3NTM4MSwiZXhwIjoyMDg0NDUxMzgxfQ.RfOeiMCJ2YZVjUe13RVPzEaHEWBcayPh0bCoMkJJoJM'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkConstraints() {
  console.log('🕵️‍♀️ Checking Appointments Table Constraints')
  
  // Try to insert a dummy appointment with NO email to see specific error
  const dummy = {
    shop_id: '1de86856-4f2d-4888-9989-bb6afaf8df25', // Use a real shop ID if possible or random UUID might fail FK
    professional_id: '65528e6b-1363-4328-8aba-165eeb052812', // Real prof ID from previous debug
    service_id: 'aa577415-ffac-4219-8c76-8b5b438ced7b', // Real service ID
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    customer_name: 'Debug Test',
    customer_phone: '5491112345678',
    // customer_email intentionally missing
  }

  console.log('Attempting insert without email...')
  const { data, error } = await supabase
    .from('appointments')
    .insert(dummy)
    .select()

  if (error) {
    console.log('❌ Insert Failed:')
    console.error(error)
  } else {
    console.log('✅ Insert Success (Email is NOT required at DB level)')
    // Clean up
    await supabase.from('appointments').delete().eq('id', data[0].id)
  }
}

checkConstraints()
