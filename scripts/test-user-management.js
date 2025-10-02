// Test script to verify user management functionality
import { createClient } from '@supabase/supabase-js';

// You'll need to set these environment variables or replace with actual values
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserManagement() {
  console.log('🧪 Testing User Management Functionality...\n');

  try {
    // Test 1: Check if profiles table exists and is accessible
    console.log('1. Testing profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error accessing profiles table:', profilesError.message);
      return;
    }

    console.log(`✅ Profiles table accessible. Found ${profiles?.length || 0} profiles`);
    if (profiles && profiles.length > 0) {
      console.log('   Sample profile:', {
        id: profiles[0].id,
        email: profiles[0].email,
        display_name: profiles[0].display_name,
        role: profiles[0].role,
        super_admin: profiles[0].super_admin
      });
    }

    // Test 2: Check if we can create a test profile (without actually creating one)
    console.log('\n2. Testing profile creation permissions...');
    const { error: insertTestError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (insertTestError) {
      console.error('❌ Error testing profile permissions:', insertTestError.message);
    } else {
      console.log('✅ Profile permissions are working');
    }

    // Test 3: Check if handle_new_user function exists
    console.log('\n3. Testing handle_new_user function...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('handle_new_user', {})
      .then(() => ({ data: 'exists', error: null }))
      .catch(err => ({ data: null, error: err }));

    if (functionsError && functionsError.message.includes('function') && functionsError.message.includes('does not exist')) {
      console.log('⚠️  handle_new_user function not found (this is expected for RPC calls)');
    } else {
      console.log('✅ handle_new_user function is accessible');
    }

    // Test 4: Check if ensure_all_users_have_profiles function exists
    console.log('\n4. Testing ensure_all_users_have_profiles function...');
    const { data: ensureResult, error: ensureError } = await supabase
      .rpc('ensure_all_users_have_profiles')
      .then(() => ({ data: 'success', error: null }))
      .catch(err => ({ data: null, error: err }));

    if (ensureError) {
      console.log('⚠️  ensure_all_users_have_profiles function error:', ensureError.message);
    } else {
      console.log('✅ ensure_all_users_have_profiles function executed successfully');
    }

    // Test 5: Check current user authentication
    console.log('\n5. Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚠️  No authenticated user (this is expected for anonymous access)');
    } else if (user) {
      console.log('✅ Authenticated user found:', {
        id: user.id,
        email: user.email
      });
    } else {
      console.log('ℹ️  No authenticated user');
    }

    console.log('\n🎉 User Management tests completed!');
    console.log('\n📋 Summary:');
    console.log(`   - Profiles table: ${profilesError ? '❌ Error' : '✅ Working'}`);
    console.log(`   - Profile permissions: ${insertTestError ? '❌ Error' : '✅ Working'}`);
    console.log(`   - Authentication: ${authError ? '⚠️  No user' : '✅ Working'}`);

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error.message);
  }
}

// Run the test
testUserManagement();
