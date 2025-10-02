// Simple database connection test
const { createClient } = require('@supabase/supabase-js');

// Use the actual Supabase URL from the error messages in the console
const supabaseUrl = 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2d6aHd6dWNpaml5dnlnbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MzQ4MDAsImV4cCI6MjA1MTMxMDgwMH0.placeholder'; // This is a placeholder

console.log('🧪 Testing Database Connection...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Simple connection test
    console.log('1. Testing basic connection...');
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }

    console.log('✅ Database connection successful');

    // Test 2: Check profiles table structure
    console.log('\n2. Testing profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);

    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError.message);
      return;
    }

    console.log(`✅ Profiles table accessible. Found ${profiles?.length || 0} profiles`);
    
    if (profiles && profiles.length > 0) {
      console.log('   Sample profile structure:');
      const sample = profiles[0];
      Object.keys(sample).forEach(key => {
        console.log(`     - ${key}: ${typeof sample[key]} (${sample[key]})`);
      });
    }

    console.log('\n🎉 Database tests completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testConnection();
