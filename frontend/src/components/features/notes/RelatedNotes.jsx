import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import NoteCard from './NoteCard';

const RelatedNotes = ({ currentNoteId, subject }) => {
    const [relatedNotes, setRelatedNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRelatedNotes = async () => {
            if (!subject) return;

            try {
                setLoading(true);
                // Fetch notes with the same subject
                const { data } = await api.get(`/notes?search=${encodeURIComponent(subject)}`);

                // Filter out the current note and limit to 3 items
                const filtered = data
                    .filter(note => note.id !== currentNoteId)
                    .slice(0, 3);

                setRelatedNotes(filtered);
            } catch (error) {
                console.error('Error fetching related notes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRelatedNotes();
    }, [currentNoteId, subject]);

    if (loading || relatedNotes.length === 0) return null;

    return (
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Related Notes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedNotes.map(note => (
                    <NoteCard key={note.id} note={note} /> // passing isWishlisted={false} for now as context is tricky here without props drilling or context
                ))}
            </div>
        </div>
    );
};

export default RelatedNotes;
