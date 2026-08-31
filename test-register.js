import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kvtqcxyqjsodzdjshits.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'REPLACE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRegister() {
  console.log("Testing Registration...");
  const { data, error } = await supabase.auth.signUp({
    email: 'test_user_' + Date.now() + '@example.com',
    password: 'Password123!',
    options: {
      data: {
        shop_name: 'Test Shop',
        phone_number: '123456789'
      }
    }
  });

  if (error) {
    console.error("SignUp Error:", error);
  } else {
    console.log("SignUp Success:", data);
  }
}

testRegister();
