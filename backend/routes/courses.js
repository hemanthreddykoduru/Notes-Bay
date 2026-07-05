const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const requireAuth = require('../middleware/auth');
const multer = require('multer');
const jwt = require('jsonwebtoken');

// Proxy route for streaming video securely
router.get('/proxy-video', (req, res) => {
    const { ticket } = req.query;
    if (!ticket) return res.status(400).send("No ticket provided");

    try {
        const decoded = jwt.verify(ticket, process.env.JWT_SECRET || 'secret');
        if (!decoded.url) throw new Error("Invalid ticket payload");
        
        // Redirect browser to stream directly from Azure
        res.redirect(302, decoded.url);
    } catch (err) {
        res.status(403).send("Invalid or expired video ticket");
    }
});

// Initialize Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for resources
    },
});

// Helper to check admin
const checkAdmin = async (userId) => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
    if (error || !profile) return false;
    return profile.role === 'admin';
};

// Get all published courses
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, price, thumbnail_url, level, language, estimated_duration, instructor_id, program_outline, profiles(full_name, bio, title, avatar_url)')
      .eq('is_published', true);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get my enrolled courses
router.get('/my-learning', requireAuth, async (req, res) => {
  try {
    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        created_at,
        courses (
          id, title, description, thumbnail_url, estimated_duration, program_outline,
          profiles (full_name),
          course_modules (
            id,
            lessons (id)
          )
        )
      `)
      .eq('user_id', req.user.id);

    if (error) throw error;
    
    // Safety check just in case the join returns null for courses
    const validEnrollments = enrollments ? enrollments.filter(e => e.courses) : [];

    const formatted = validEnrollments.map(e => {
        const c = e.courses;
        const totalLessons = c?.course_modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
        return {
            ...c,
            enrolled_at: e.created_at,
            total_lessons: totalLessons,
            completed_lessons: 0, // Placeholder for actual progress calculation
            progress_percentage: 0
        };
    });

    res.json(formatted);

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching my learning:', err);
    res.status(500).json({ error: 'Failed to fetch enrolled courses' });
  }
});

// Check if user is enrolled in a specific course
router.get('/check-enrollment/:courseId', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (isAdmin) {
            return res.json({ isEnrolled: true });
        }

        const { data, error } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('course_id', req.params.courseId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
        res.json({ isEnrolled: !!data });
    } catch (err) {
        console.error('Error checking enrollment:', err);
        res.status(500).json({ error: 'Failed to check enrollment status' });
    }
});

// Free Course Enrollment
router.post('/:courseId/enroll', requireAuth, async (req, res) => {
    try {
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('price')
            .eq('id', req.params.courseId)
            .single();

        if (courseError || !course) return res.status(404).json({ error: 'Course not found' });
        if (course.price > 0) return res.status(400).json({ error: 'This course requires payment' });

        const { error } = await supabase
            .from('course_enrollments')
            .insert([{
                user_id: req.user.id,
                course_id: req.params.courseId,
                payment_id: 'free_enrollment'
            }]);

        if (error && error.code !== '23505') throw error; // Ignore duplicate
        res.json({ success: true, message: 'Enrolled successfully' });
    } catch (err) {
        console.error('Error enrolling in free course:', err);
        res.status(500).json({ error: 'Enrollment failed' });
    }
});

// Get course details including modules and lessons (metadata only, no video URLs unless enrolled)
router.get('/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    // For now, public access to metadata
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id, title, description, price, thumbnail_url, program_outline,
        level, language, estimated_duration, skills, learning_objectives, requirements,
        profiles (full_name, bio, title, avatar_url),
        course_modules (
          id, title, order_index,
          lessons (
            id, title, duration_seconds, order_index, is_free_preview, resources
          ),
          quizzes (
            id, title, passing_score_percentage, questions
          )
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;
    
    // Sort modules and lessons
    if (course.course_modules) {
        course.course_modules.sort((a,b) => a.order_index - b.order_index);
        course.course_modules.forEach(m => {
            if(m.lessons) m.lessons.sort((a,b) => a.order_index - b.order_index);
        });
    }

    res.json(course);
  } catch (err) {
    console.error('Error fetching course details:', err);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

const { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, BlobSASPermissions } = require('@azure/storage-blob');

function getSecureAzureVideoUrl(videoUrl) {
    if (!videoUrl || !videoUrl.includes('blob.core.windows.net')) return videoUrl;

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
        console.warn("AZURE_STORAGE_CONNECTION_STRING missing, returning raw video URL");
        return videoUrl;
    }

    try {
        // Extract account name and key from connection string
        const matches = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/);
        if (!matches) return videoUrl;
        
        const accountName = matches[1];
        const accountKey = matches[2];
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        // Parse container and blob name from URL
        // Example: https://hemanthvideo12345.blob.core.windows.net/videos/html-course.mp4
        const urlObj = new URL(videoUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        if (pathParts.length < 2) return videoUrl;

        const containerName = pathParts[0];
        const blobName = pathParts.slice(1).join('/');

        // Generate SAS token valid for 3 hours
        const startsOn = new Date();
        const expiresOn = new Date(startsOn);
        expiresOn.setHours(startsOn.getHours() + 3);

        const sasToken = generateBlobSASQueryParameters({
            containerName,
            blobName,
            permissions: BlobSASPermissions.parse("r"),
            startsOn,
            expiresOn
        }, sharedKeyCredential).toString();

        return `${videoUrl}?${sasToken}`;
    } catch (e) {
        console.error("Failed to generate Azure SAS URL:", e);
        return videoUrl;
    }
}

// SECURE: Get course details including VIDEO URLs (only for enrolled users or admins)
router.get('/:id/learn', requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    // 1. Check if Admin
    let hasAccess = await checkAdmin(userId);

    // 2. Check Enrollment if not admin
    if (!hasAccess) {
        const { data: enrollment, error } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();

        if (enrollment) {
            hasAccess = true;
        }
    }

    if (!hasAccess) {
        return res.status(403).json({ error: 'You must be enrolled to access this course content.' });
    }

    // 3. Fetch Course with video_url
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id, title, description, price, thumbnail_url, program_outline,
        level, language, estimated_duration, skills, learning_objectives, requirements,
        profiles (full_name, bio, title, avatar_url),
        course_modules (
          id, title, order_index,
          lessons (
            id, title, duration_seconds, order_index, is_free_preview, video_url, resources
          ),
          quizzes (
            id, title, passing_score_percentage, questions
          )
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;
    
    // Sort modules and lessons & SIGN VIDEO URLs
    if (course.course_modules) {
        course.course_modules.sort((a,b) => a.order_index - b.order_index);
        course.course_modules.forEach(m => {
            if(m.lessons) {
                m.lessons.sort((a,b) => a.order_index - b.order_index);
                // Secure video processing
                m.lessons = m.lessons.map(lesson => {
                    if (lesson.video_url) {
                        const azureUrl = getSecureAzureVideoUrl(lesson.video_url);
                        // Hiding the direct Azure link from the DOM by issuing a token
                        const ticket = jwt.sign({ url: azureUrl }, process.env.JWT_SECRET || 'secret', { expiresIn: '4h' });
                        lesson.video_ticket = ticket;
                        delete lesson.video_url; // Securely removed from payload
                    }
                    return lesson;
                });
            }
        });
    }

    res.json(course);
  } catch (err) {
    console.error('Error fetching secure course details:', err);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

// Get user progress for a course (or all progress, frontend filters by what it needs)
router.get('/:id/progress', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('lesson_progress')
            .select('lesson_id, is_completed, last_watched_at')
            .eq('user_id', userId)
            .eq('is_completed', true);

        if (error) throw error;
        
        // Return an array of completed item IDs for easy frontend checking
        const completedIds = data.map(p => p.lesson_id);
        res.json({ completedIds, progress: data });
    } catch (err) {
        console.error('Error fetching course progress:', err);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

// Mark an item (lesson/quiz) as complete
router.post('/:id/progress', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // The frontend sends item_id, we map it to lesson_id
        const { item_id } = req.body;

        if (!item_id) {
            return res.status(400).json({ error: 'item_id is required' });
        }

        const { data, error } = await supabase
            .from('lesson_progress')
            .upsert({
                user_id: userId,
                lesson_id: item_id,
                is_completed: true,
                last_watched_at: new Date().toISOString()
            }, { onConflict: 'user_id,lesson_id' })
            .select();

        if (error) {
            console.error('Supabase raw error saving progress:', JSON.stringify(error, null, 2));
            throw error;
        }
        res.json({ success: true, progress: data[0] });
    } catch (err) {
        console.error('Full Error saving progress:', err);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});

// Admin: Get all courses (including unpublished)
router.get('/admin/all', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { data, error } = await supabase
            .from('courses')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching admin courses:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get course details WITH raw video_urls for editing
router.get('/admin/:id', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const courseId = req.params.id;
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select(`
                id, title, description, price, thumbnail_url, program_outline,
                level, language, estimated_duration, skills, learning_objectives, requirements,
                profiles (full_name, bio, title, avatar_url),
                course_modules (
                    id, title, order_index,
                    lessons (
                        id, title, duration_seconds, order_index, is_free_preview, video_url, resources
                    ),
                    quizzes (
                        id, title, passing_score_percentage, questions
                    )
                )
            `)
            .eq('id', courseId)
            .single();

        if (courseError) throw courseError;
        
        // Sort modules and lessons
        if (course.course_modules) {
            course.course_modules.sort((a,b) => a.order_index - b.order_index);
            course.course_modules.forEach(m => {
                if(m.lessons) m.lessons.sort((a,b) => a.order_index - b.order_index);
            });
        }

        res.json(course);
    } catch (err) {
        console.error('Error fetching admin course details:', err);
        res.status(500).json({ error: 'Failed to fetch course details' });
    }
});

// Admin: Create course
router.post('/', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { 
            title, description, price, thumbnail_url, is_published, program_outline, offer_text,
            level, language, estimated_duration, skills, learning_objectives, requirements 
        } = req.body;
        
        const { data, error } = await supabase
            .from('courses')
            .insert([{ 
                title, description, price, thumbnail_url, is_published, program_outline, offer_text,
                instructor_id: req.user.id,
                level, language, estimated_duration, skills, learning_objectives, requirements
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error('Error creating course:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update course
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { 
            title, description, price, thumbnail_url, is_published, program_outline, offer_text,
            level, language, estimated_duration, skills, learning_objectives, requirements 
        } = req.body;
        
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = price;
        if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
        if (is_published !== undefined) updates.is_published = is_published;
        if (level !== undefined) updates.level = level;
        if (language !== undefined) updates.language = language;
        if (estimated_duration !== undefined) updates.estimated_duration = estimated_duration;
        if (skills !== undefined) updates.skills = skills;
        if (learning_objectives !== undefined) updates.learning_objectives = learning_objectives;
        if (requirements !== undefined) updates.requirements = requirements;
        if (program_outline !== undefined) updates.program_outline = program_outline;
        if (offer_text !== undefined) updates.offer_text = offer_text;

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates provided' });

        const { data, error } = await supabase
            .from('courses')
            .update(updates)
            .eq('id', req.params.id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error('Error updating course:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete course
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        console.error('Error deleting course:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Add Module
router.post('/:courseId/modules', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { title, order_index } = req.body;
        const { data, error } = await supabase
            .from('course_modules')
            .insert([{ course_id: req.params.courseId, title, order_index }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update Module
router.put('/modules/:moduleId', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { title, order_index } = req.body;
        const { data, error } = await supabase
            .from('course_modules')
            .update({ title, order_index })
            .eq('id', req.params.moduleId)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete Module
router.delete('/modules/:moduleId', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { error } = await supabase.from('course_modules').delete().eq('id', req.params.moduleId);
        if (error) throw error;
        res.json({ message: 'Module deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Add Lesson
router.post('/modules/:moduleId/lessons', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { title, video_url, duration_seconds, order_index, is_free_preview } = req.body;
        const { data, error } = await supabase
            .from('lessons')
            .insert([{ module_id: req.params.moduleId, title, video_url, duration_seconds, order_index, is_free_preview }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update Lesson
router.put('/lessons/:lessonId', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { title, video_url, duration_seconds, order_index, is_free_preview } = req.body;
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (video_url !== undefined) updates.video_url = video_url;
        if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds;
        if (order_index !== undefined) updates.order_index = order_index;
        if (is_free_preview !== undefined) updates.is_free_preview = is_free_preview;

        const { data, error } = await supabase
            .from('lessons')
            .update(updates)
            .eq('id', req.params.lessonId)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete Lesson
router.delete('/lessons/:lessonId', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { error } = await supabase.from('lessons').delete().eq('id', req.params.lessonId);
        if (error) throw error;
        res.json({ message: 'Lesson deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Upload a resource file to a lesson
router.post('/modules/:moduleId/lessons/:lessonId/resources', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { lessonId } = req.params;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        // 1. Fetch current lesson to get the current resources array
        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select('resources')
            .eq('id', lessonId)
            .single();

        if (lessonError) throw lessonError;
        let currentResources = lesson.resources || [];
        if (!Array.isArray(currentResources)) currentResources = [];

        // 2. Upload to Supabase Storage (bucket: course-resources)
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `lesson_${lessonId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('course-resources')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) {
             console.error("Storage upload error:", uploadError);
             return res.status(500).json({ error: 'Failed to upload file to storage. Ensure "course-resources" bucket exists and is public.' });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('course-resources')
            .getPublicUrl(filePath);

        // Calculate size nicely
        const bytes = file.size;
        const sizeString = bytes < 1024 * 1024 
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

        // 3. Append to JSON resources array
        const newResource = {
            name: file.originalname,
            url: publicUrl,
            size: sizeString,
            key: filePath
        };
        currentResources.push(newResource);

        // 4. Update Database
        const { data: updateData, error: updateError } = await supabase
            .from('lessons')
            .update({ resources: currentResources })
            .eq('id', lessonId)
            .select();

        if (updateError) throw updateError;
        res.json({ success: true, resources: updateData[0].resources });

    } catch (err) {
        console.error('Error uploading resource:', err);
        res.status(500).json({ error: 'Failed to upload resource' });
    }
});

// Admin: Delete a specific resource from a lesson
router.delete('/modules/:moduleId/lessons/:lessonId/resources', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { lessonId } = req.params;
        const { key } = req.body;

        if (!key) return res.status(400).json({ error: 'Resource key is required' });

        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select('resources')
            .eq('id', lessonId)
            .single();

        if (lessonError) throw lessonError;
        let currentResources = lesson.resources || [];
        if (!Array.isArray(currentResources)) currentResources = [];

        const { error: deleteError } = await supabase.storage
            .from('course-resources')
            .remove([key]);
        
        if (deleteError) console.error("Could not delete from storage, might already be gone:", deleteError);

        const updatedResources = currentResources.filter(r => r.key !== key);

        const { data: updateData, error: updateError } = await supabase
            .from('lessons')
            .update({ resources: updatedResources })
            .eq('id', lessonId)
            .select();

        if (updateError) throw updateError;
        res.json({ success: true, resources: updateData[0].resources });

    } catch (err) {
        console.error('Error deleting resource:', err);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});

// Admin: Add Quiz
router.post('/modules/:moduleId/quizzes', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { title, passing_score_percentage, questions } = req.body;
        const { data, error } = await supabase
            .from('quizzes')
            .insert([{ module_id: req.params.moduleId, title, passing_score_percentage, questions: questions || [] }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update Quiz
router.put('/quizzes/:quizId', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { title, passing_score_percentage, questions } = req.body;
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (passing_score_percentage !== undefined) updates.passing_score_percentage = passing_score_percentage;
        if (questions !== undefined) updates.questions = questions;

        const { data, error } = await supabase
            .from('quizzes')
            .update(updates)
            .eq('id', req.params.quizId)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete Quiz
router.delete('/quizzes/:quizId', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { error } = await supabase.from('quizzes').delete().eq('id', req.params.quizId);
        if (error) throw error;
        res.json({ message: 'Quiz deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
