const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const checkAdmin = require('../utils/checkAdmin');

// 1. GET all questions and their answers for a specific course
router.get('/course/:courseId', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;

        const { data, error } = await supabase
            .from('course_questions')
            .select(`
                id, course_id, lesson_id, user_id, content, created_at,
                profiles (full_name, avatar_url, role),
                course_answers (
                    id, question_id, user_id, content, is_instructor_reply, created_at,
                    profiles (full_name, avatar_url, role)
                )
            `)
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Sort answers for each question so instructor replies or oldest are first
        if (data) {
            data.forEach(q => {
                if (q.course_answers) {
                    q.course_answers.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                }
            });
        }

        res.json(data || []);
    } catch (err) {
        console.error('Error fetching Q&A:', err);
        res.status(500).json({ error: 'Failed to fetch Questions and Answers' });
    }
});

// 2. POST a new question
router.post('/course/:courseId', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { content, lesson_id } = req.body;
        const userId = req.user.id;

        if (!content) return res.status(400).json({ error: 'Question content is required' });

        const { data, error } = await supabase
            .from('course_questions')
            .insert([{ 
                course_id: courseId, 
                user_id: userId, 
                lesson_id: lesson_id || null, 
                content 
            }])
            .select('*, profiles(full_name, avatar_url, role)')
            .single();

        if (error) throw error;
        
        // Append empty answers array for the frontend to digest easily
        const questionWithAnswers = { ...data, course_answers: [] };
        
        res.status(201).json(questionWithAnswers);
    } catch (err) {
        console.error('Error creating question:', err);
        res.status(500).json({ error: 'Failed to post question' });
    }
});

// 3. POST a reply/answer to a question
router.post('/reply/:questionId', requireAuth, async (req, res) => {
    try {
        const { questionId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) return res.status(400).json({ error: 'Reply content is required' });

        // Check if the user is an admin/instructor
        const isAdmin = await checkAdmin(userId);

        const { data, error } = await supabase
            .from('course_answers')
            .insert([{ 
                question_id: questionId, 
                user_id: userId, 
                content,
                is_instructor_reply: isAdmin 
            }])
            .select('*, profiles(full_name, avatar_url, role)')
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error posting reply:', err);
        res.status(500).json({ error: 'Failed to post reply' });
    }
});

module.exports = router;
