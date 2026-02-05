const supabase = require('../config/supabase');

// GET /api/notes
exports.getNotes = async (req, res) => {
    try {
        const { search, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;

        let query = supabase
            .from('notes')
            .select('*, reviews(rating)', { count: 'exact' })
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

            const { reviews, ...noteData } = note;
            return {
                ...noteData,
                average_rating: parseFloat(avgRating.toFixed(1)),
                review_count: ratings.length
            };
        });

        // Sorting
        let sortedNotes = notesWithStats;
        if (sort === 'price_asc') {
            sortedNotes.sort((a, b) => a.price - b.price);
        } else if (sort === 'price_desc') {
            sortedNotes.sort((a, b) => b.price - a.price);
        } else {
            // Default: Newest first
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
};

// GET /api/notes/admin/all
exports.getAdminNotes = async (req, res) => {
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
};

// GET /api/notes/:id
exports.getNoteDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        // 1. Fetch Note Details
        const { data: note, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // If no user (Guest), return basic info only
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

        // 3. Check for Active Subscription
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

        // 4. Check for Individual Purchase
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
                const urlObj = new URL(note.file_url);
                const pathParts = urlObj.pathname.split('/notes/');
                if (pathParts.length > 1) {
                    const filePath = pathParts[1];
                    const { data: signedData, error: signError } = await supabase
                        .storage
                        .from('notes')
                        .createSignedUrl(filePath, 60);

                    if (!signError && signedData) {
                        signedUrl = signedData.signedUrl;
                    }
                }
            } catch (e) {
                console.error('Error generating signed URL:', e);
            }

            return res.json({ ...note, file_url: signedUrl, hasAccess: true });
        }

        const { file_url, ...safeNote } = note;
        return res.json({ ...safeNote, hasAccess: false });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/notes
exports.createNote = async (req, res) => {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        const { title, subject, price, file_url, preview_url, description } = req.body;

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
};

// PUT /api/notes/:id
exports.updateNote = async (req, res) => {
    try {
        const { id } = req.params;

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
};

// DELETE /api/notes/:id
exports.deleteNote = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

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
};
