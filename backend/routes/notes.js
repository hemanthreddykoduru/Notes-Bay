const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');

// GET /api/notes - List all active notes
router.get('/', async (req, res) => {
  try {
    const { search, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;

    let query = supabase
      .from('notes')
      .select('*, reviews(rating)', { count: 'exact' }) // Fetch ratings + total count
      .eq('is_active', true);

    // Search Filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    // Price Filter
    if (minPrice) {
      query = query.gte('price', minPrice);
    }
    if (maxPrice) {
      query = query.lte('price', maxPrice);
    }

    const { data: notes, error, count } = await query;

    if (error) throw error;

    // Calculate Average Rating
    const notesWithStats = notes.map(note => {
        const ratings = note.reviews || [];
        const avgRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0;
        
        // Remove the raw reviews array to keep response light, unless needed
        const { reviews, ...noteData } = note; 
        return {
            ...noteData,
            average_rating: parseFloat(avgRating.toFixed(1)),
            review_count: ratings.length
        };
    });

    // Sorting (Client-side sorting needed for rating, or DB sorting if simple)
    // Re-applying sort logic here since we have calculated fields, 
    // OR keep DB sort for price/date as before.
    let sortedNotes = notesWithStats;
    if (sort === 'price_asc') {
        sortedNotes.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
        sortedNotes.sort((a, b) => b.price - a.price);
    } else {
        // Default: Newest first (already sorted by DB query usually, but ensure it)
        sortedNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedNotes = sortedNotes.slice(startIndex, endIndex);

    res.json({
      notes: paginatedNotes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || sortedNotes.length,
        totalPages: Math.ceil((count || sortedNotes.length) / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notes/admin/all - List ALL notes (Admin only)
router.get('/admin/all', requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        const { data: notes, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(notes);
    } catch (error) {
        console.error('Error fetching admin notes:', error);
        res.status(500).json({ error: error.message });
    }
});

const optionalAuth = require('../middleware/optionalAuth');

// ... [existing search route] ...

// GET /api/notes/:id - Get note details (Secured)
// Use optionalAuth to populate req.user if a token is present
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // SECURITY FIX: Do NOT trust x-user-id header. Use verified req.user.id from middleware.
    const userId = req.user ? req.user.id : null; 

    // 1. Fetch Note Details
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // If no user (Guest), return basic info only (no file_url)
    if (!userId) {
        const { file_url, ...safeNote } = note;
        return res.json({ ...safeNote, hasAccess: false });
    }

    // 2. Check for Admin Role
    let role = 'user';
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
    
    if (profile) role = profile.role;

    // 3. Check for Active Subscription (if not admin)
    let subscriptions = [];
    if (role !== 'admin') {
        const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .gt('end_date', new Date().toISOString())
            .limit(1);
        subscriptions = subData || [];
    }

    // 4. Check for Individual Purchase (if not admin and no subscription)
    let purchases = [];
    if (role !== 'admin' && (!subscriptions || subscriptions.length === 0)) {
        const { data: purchaseData } = await supabase
            .from('purchases')
            .select('*')
            .eq('user_id', userId)
            .eq('note_id', id)
            .limit(1);
        purchases = purchaseData || [];
    }

    const hasAccess = role === 'admin' || (subscriptions && subscriptions.length > 0) || (purchases && purchases.length > 0);

    if (hasAccess) {
        // Generate Signed URL
        let signedUrl = note.file_url;
        try {
            // Extract path from public URL if possible, or assume file_url IS the path if changed in future
            // Current format: https://[project].supabase.co/storage/v1/object/public/notes/[filename]
            const urlObj = new URL(note.file_url);
            const pathParts = urlObj.pathname.split('/notes/'); // Split by bucket name
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                const { data: signedData, error: signError } = await supabase
                    .storage
                    .from('notes')
                    .createSignedUrl(filePath, 60); // Valid for 60 seconds

                if (!signError && signedData) {
                    signedUrl = signedData.signedUrl;
                }
            }
        } catch (e) {
            console.error('Error generating signed URL:', e);
            // Fallback to original URL if parsing fails (for backward compatibility)
        }
        
        return res.json({ ...note, file_url: signedUrl, hasAccess: true });
    }

    // 4. No Access - Strip file_url
    const { file_url, ...safeNote } = note;
    return res.json({ ...safeNote, hasAccess: false });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notes - Create a new note (Admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const { title, subject, price, file_url, preview_url, description } = req.body;
    
    // Insert note
    const { data, error } = await supabase
      .from('notes')
      .insert([{ title, subject, price, file_url, preview_url, description }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error in POST /api/notes:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// PUT /api/notes/:id - Update a note (Admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const { title, subject, price, file_url, preview_url, is_active, description } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (price !== undefined) updates.price = price;
    if (file_url !== undefined) updates.file_url = file_url;
    if (preview_url !== undefined) updates.preview_url = preview_url;
    if (is_active !== undefined) updates.is_active = is_active;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Update note
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error in PUT /api/notes/:id:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/notes/:id - Delete a note (Admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    // Delete note
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/notes/:id:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
