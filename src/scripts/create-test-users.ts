// Script to create test users in Supabase Auth
// This creates auth accounts for existing database users

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test users to create (matching existing database users)
const testUsers = [
  {
    email: 'paivaedu.br@gmail.com',
    password: 'password123',
    user_id: '519e2350-ea9b-411e-b5b3-1cb15107277b',
    first_name: 'Eduardo',
    last_name: 'Paiva'
  },
  {
    email: 'trader_1@test.emapay.com',
    password: 'password123',
    user_id: '11111111-1111-1111-1111-111111111111',
    first_name: 'TRADER_1',
    last_name: 'Test'
  },
  {
    email: 'trader_2@test.emapay.com',
    password: 'password123',
    user_id: '22222222-2222-2222-2222-222222222222',
    first_name: 'TRADER_2',
    last_name: 'Test'
  },
  {
    email: 'trader_3@test.emapay.com',
    password: 'password123',
    user_id: '33333333-3333-3333-3333-333333333333',
    first_name: 'TRADER_3',
    last_name: 'Test'
  }
]

async function createTestUsers() {
  console.log('🔧 Creating test users in Supabase Auth...')

  for (const user of testUsers) {
    try {
      console.log(`\n📧 Creating user: ${user.email}`)
      
      // Create user in Supabase Auth with specific UUID
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email for testing
        user_metadata: {
          first_name: user.first_name,
          last_name: user.last_name
        }
      })

      if (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message)
      } else {
        console.log(`✅ Created auth user: ${user.email}`)
        console.log(`   Auth ID: ${data.user?.id}`)
        console.log(`   Database ID: ${user.user_id}`)
        
        // Note: We'll need to update the users table to link auth_id to our existing user records
        // For now, we'll use the email to match users during authentication
      }
    } catch (err) {
      console.error(`❌ Exception creating ${user.email}:`, err)
    }
  }

  console.log('\n🎉 Test user creation complete!')
  console.log('\n📋 Test Credentials:')
  testUsers.forEach(user => {
    console.log(`   ${user.email} / password123`)
  })
}

// Run the script
if (require.main === module) {
  createTestUsers().catch(console.error)
}

export { createTestUsers, testUsers }
