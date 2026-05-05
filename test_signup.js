const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSignup() {
  console.log('Signing up...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test_student_12345@gmail.com',
    password: 'password123',
  });

  if (error) {
    console.error('Signup error:', error);
    return;
  }

  console.log('Signup success:', data.user.id);
  console.log('Identities length:', data.user.identities?.length);

  console.log('Inserting profile...');
  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    full_name: 'Test Student',
    email: 'test_student_12345@gmail.com',
    role: 'student',
    roll_number: 'TEST-123',
  });

  if (profileError) {
    console.error('Profile insert error:', profileError);
  } else {
    console.log('Profile insert success!');
  }
}

testSignup();
