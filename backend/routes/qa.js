const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
// Helper to verify admin status
const checkAdmin = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
        if (error) return false;
        return data?.role === 'admin';
    } catch {
        return false;
    }
};
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

// 4. PUT (Edit) a reply/answer
router.put('/reply/:replyId', requireAuth, async (req, res) => {
    try {
        const { replyId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) return res.status(400).json({ error: 'Reply content is required' });

        // First check if the user is the author or an admin
        const { data: reply, error: fetchError } = await supabase
            .from('course_answers')
            .select('user_id')
            .eq('id', replyId)
            .single();

        if (fetchError || !reply) return res.status(404).json({ error: 'Reply not found' });

        const isAdmin = await checkAdmin(userId);
        if (reply.user_id !== userId && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden. You can only edit your own replies.' });
        }

        const { data, error } = await supabase
            .from('course_answers')
            .update({ content })
            .eq('id', replyId)
            .select('*, profiles(full_name, avatar_url, role)')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error editing reply:', err);
        res.status(500).json({ error: 'Failed to edit reply' });
    }
});

// 5. DELETE a reply/answer
router.delete('/reply/:replyId', requireAuth, async (req, res) => {
    try {
        const { replyId } = req.params;
        const userId = req.user.id;

        // First check if the user is the author or an admin
        const { data: reply, error: fetchError } = await supabase
            .from('course_answers')
            .select('user_id')
            .eq('id', replyId)
            .single();

        if (fetchError || !reply) return res.status(404).json({ error: 'Reply not found' });

        const isAdmin = await checkAdmin(userId);
        if (reply.user_id !== userId && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden. You can only delete your own replies.' });
        }

        const { error } = await supabase
            .from('course_answers')
            .delete()
            .eq('id', replyId);

        if (error) throw error;
        res.json({ success: true, message: 'Reply deleted successfully' });
    } catch (err) {
        console.error('Error deleting reply:', err);
        res.status(500).json({ error: 'Failed to delete reply' });
    }
});

module.exports = router;
