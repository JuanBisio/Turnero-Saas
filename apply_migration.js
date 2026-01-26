/**
 * Apply Migration: Public Widget Access
 * This script applies the RLS policies to allow public read access for the widget
 * 
 * Alternative approach: Execute SQL directly via Supabase Dashboard or psql
 */

const fs = require('fs')
const path = require('path')

console.log('📋 Migration Script - Public Widget Access')
console.log('=' .repeat(60))
console.log('')

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '010_public_widget_access.sql')
const sql = fs.readFileSync(migrationPath, 'utf8')

console.log('✅ Migration file loaded successfully')
console.log('📄 File:', migrationPath)
console.log('')
console.log('=' .repeat(60))
console.log('📝 SQL TO EXECUTE:')
console.log('=' .repeat(60))
console.log('')
console.log(sql)
console.log('')
console.log('=' .repeat(60))
console.log('')
console.log('🔧 HOW TO APPLY THIS MIGRATION:')
console.log('')
console.log('Option 1: Supabase Dashboard (RECOMMENDED)')
console.log('  1. Go to https://supabase.com/dashboard')
console.log('  2. Select your project')
console.log('  3. Go to "SQL Editor" in the left sidebar')
console.log('  4. Click "New query"')
console.log('  5. Copy and paste the SQL above')
console.log('  6. Click "Run" to execute')
console.log('')
console.log('Option 2: Use psql (if you have it installed)')
console.log('  psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \\')
console.log('       -f supabase/migrations/010_public_widget_access.sql')
console.log('')
console.log('=' .repeat(60))
console.log('')
console.log('💡 After applying the migration:')
console.log('  - Open your widget in incognito mode')
console.log('  - Select service → professional → date')
console.log('  - Available time slots should now load correctly')
console.log('=' .repeat(60))

// Save SQL to clipboard-friendly file
const outputPath = path.join(__dirname, 'migration_to_apply.sql')
fs.writeFileSync(outputPath, sql)
console.log('')
console.log(`✅ SQL also saved to: ${outputPath}`)
console.log('   You can copy this file content to Supabase Dashboard')
console.log('')
