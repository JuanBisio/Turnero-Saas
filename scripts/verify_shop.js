
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  try {
    // 1. Read .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
      console.error('Error: .env.local not found at', envPath);
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[match[1].trim()] = value;
      }
    });

    const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
    const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
      console.log('Keys found:', Object.keys(envVars));
      process.exit(1);
    }

    // 2. Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Query Shop
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('slug', 'demo')
      .single();

    if (error) {
        if (error.code === 'PGRST116') { // JSON object requested, multiple (or no) rows returned
             console.log('Shop "demo" NOT FOUND.');
        } else {
            console.error('Error querying shop:', error);
        }
    } else {
      console.log('Shop "demo" FOUND:', data);
    }

  } catch (err) {
    console.error('Script error:', err);
  }
}

main();
