import VideoNote from '../models/VideoNoteModel.js';
import Session from '../models/SessionModel.js';
import Enrollment from '../models/EnrollmentModel.js';

// POST /api/lms/sessions/:sessionId/notes
export const createNote = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { noteText, timestamp } = req.body;
        const studentId = req.user.id;

        if (!noteText) {
            return res.status(400).json({ message: 'Note text is required' });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Verify enrollment
        const enrollment = await Enrollment.findOne({ studentId, courseId: session.courseId });
        if (!enrollment) {
            return res.status(403).json({ message: 'Not enrolled in this course' });
        }

        const note = await VideoNote.create({
            studentId,
            courseId: session.courseId,
            sessionId,
            timestamp: timestamp || null,
            noteText
        });

        return res.status(201).json({ message: 'Note created successfully', note });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/lms/sessions/:sessionId/notes
export const getNotesBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user.id;

        const notes = await VideoNote.find({ studentId, sessionId }).sort({ timestamp: 1, createdAt: 1 });
        return res.status(200).json({ notes });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT /api/lms/notes/:noteId
export const updateNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { noteText } = req.body;
        const studentId = req.user.id;

        if (!noteText) {
            return res.status(400).json({ message: 'Note text is required' });
        }

        const note = await VideoNote.findOne({ _id: noteId, studentId });
        if (!note) {
            return res.status(404).json({ message: 'Note not found or unauthorized' });
        }

        note.noteText = noteText;
        await note.save();

        return res.status(200).json({ message: 'Note updated successfully', note });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// DELETE /api/lms/notes/:noteId
export const deleteNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const studentId = req.user.id;

        const note = await VideoNote.findOneAndDelete({ _id: noteId, studentId });
        if (!note) {
            return res.status(404).json({ message: 'Note not found or unauthorized' });
        }

        return res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    createNote,
    getNotesBySession,
    updateNote,
    deleteNote
};
