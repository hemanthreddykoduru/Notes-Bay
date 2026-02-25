require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.rpc('hello_world'); // Just trigger a connection if not exist
    
    // Direct raw insert to see if the table exists at all
    const res = await supabase.from('lesson_progress').select('*').limit(1);
    console.log(JSON.stringify(res, null, 2));
}
test();
