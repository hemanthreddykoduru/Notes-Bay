require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if(bucketError) {
        console.error("Bucket fetch error:", bucketError);
    } else {
        const hasCourseResources = buckets.some(b => b.name === 'course-resources');
        console.log("Buckets:", buckets.map(b => b.name).join(', '));
        console.log("Has course-resources?:", hasCourseResources);
    }
    
    // Test upload
    const { data, error: uploadError } = await supabase.storage.from('course-resources').upload('test-upload-script.txt', 'hello testing', { upsert: true });
    if (uploadError) {
        console.log("Upload error:", JSON.stringify(uploadError, null, 2));
    } else {
        console.log("Upload successful:", data);
        await supabase.storage.from('course-resources').remove(['test-upload-script.txt']);
    }
}
run();
