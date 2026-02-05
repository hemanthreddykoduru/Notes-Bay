const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const notesController = require('../controllers/notesController');

// GET /api/notes - List all active notes
router.get('/', notesController.getNotes);

// GET /api/notes/admin/all - List ALL notes (Admin only)
router.get('/admin/all', requireAuth, notesController.getAdminNotes);

// GET /api/notes/:id - Get note details (Secured)
router.get('/:id', optionalAuth, notesController.getNoteDetails);

// POST /api/notes - Create a new note (Admin only)
router.post('/', requireAuth, notesController.createNote);

// PUT /api/notes/:id - Update a note (Admin only)
router.put('/:id', requireAuth, notesController.updateNote);

// DELETE /api/notes/:id - Delete a note (Admin only)
router.delete('/:id', requireAuth, notesController.deleteNote);

module.exports = router;
