require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
    // Attempt to insert with explicit column names
    const res2 = await supabase
      .from('lesson_progress')
      .upsert({ user_id: '11111111-1111-1111-1111-111111111111', item_id: '11111111-1111-1111-1111-111111111111', item_type: 'lesson', completed_at: new Date().toISOString() });
    console.log("Upsert result:", JSON.stringify(res2, null, 2));
}
test();
