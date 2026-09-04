const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eaygaaapzsqyzazyrbya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVheWdhYWFwenNxeXphenlyYnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MDMzOTYsImV4cCI6MjEwNDA3OTM5Nn0.1yP8cF4Oto6U3W9vAf7BHXw6QZJgrCCXHjBfc62A55U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const sessionToken = 'test-token-123';
  
  console.log('Inserting room...');
  const { data, error } = await supabase
    .from('rooms')
    .insert([{ room_code: roomCode, admin_id: sessionToken, status: 'waiting', day_count: 0 }])
    .select().single();

  console.log('Data:', data);
  console.log('Error:', error);
}

test();
