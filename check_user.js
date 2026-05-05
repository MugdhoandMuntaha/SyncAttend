const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkUser() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'junaed.mugdho@gmail.com',
    password: 'password123', // Doesn't matter if wrong, we want to see the error message
  });

  if (error) {
    console.error('Sign in error:', error.message);
  } else {
    console.log('User signed in successfully!', data.user.id);
  }
}

checkUser();
