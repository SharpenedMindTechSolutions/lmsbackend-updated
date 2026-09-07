import { GoogleGenerativeAI } from '@google/generative-ai';
import AiChatHistory from '../models/AiChatHistoryModel.js';
import Course from '../models/CourseModel.js';
import Session from '../models/SessionModel.js';

// Setup Gemini
// Make sure GEMINI_API_KEY is in your .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake-key-for-now');

export const askCopilot = async (req, res) => {
    try {
        const { courseId, sessionId, message } = req.body;
        const studentId = req.user.id;

        if (!courseId || !sessionId || !message) {
            return res.status(400).json({ message: 'courseId, sessionId, and message are required' });
        }

        if (message.length > 2000) {
            return res.status(400).json({ message: 'Message is too long' });
        }

        // Fetch course and session for context
        const course = await Course.findById(courseId);
        const session = await Session.findById(sessionId);

        if (!course || !session) {
            return res.status(404).json({ message: 'Course or Session not found' });
        }

        // Get or create chat history
        let chatHistory = await AiChatHistory.findOne({ studentId, sessionId });
        if (!chatHistory) {
            chatHistory = new AiChatHistory({
                studentId,
                courseId,
                sessionId,
                messages: []
            });
        }

        // Build the conversation history for Gemini
        // Gemini expects role: "user" | "model" and parts: [{ text: "..." }]
        const historyForGemini = chatHistory.messages.slice(-10).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        // Add system instructions as the first message or use systemInstruction parameter if supported.
        // We will prepend a strict system prompt to the user's current message to ensure it stays on track.
        const systemPrompt = `You are an AI Learning Copilot for an LMS. 
Current Course: "${course.title}"
Current Lesson: "${session.sessionTitle}"
Your job is to help the student understand this specific lesson. Do NOT answer questions unrelated to programming or the course context. Keep answers concise, educational, and use markdown where appropriate.`;

        const chat = model.startChat({
            history: historyForGemini,
            generationConfig: {
                maxOutputTokens: 1000,
            }
        });

        // Combine system prompt with the actual user message for strong steering
        const prompt = `[SYSTEM INSTRUCTION: ${systemPrompt}]\n\nUser Question: ${message}`;

        let responseText = "";
        try {
            if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'fake-key-for-now') {
                const result = await chat.sendMessage(prompt);
                responseText = result.response.text();
            } else {
                throw new Error("Fake API key used");
            }
        } catch (e) {
            console.log("Mocking AI response due to error or missing API key:", e.message);
            responseText = `**MOCK AI RESPONSE**\n\nI am the AI Copilot. Since no valid Gemini API key was provided, here is a simulated response to your question about "${course.title} - ${session.sessionTitle}".\n\nYour question: "${message}"\n\n*This is a fallback response for E2E testing.*`;
        }

        // Save to DB
        chatHistory.messages.push({ role: 'user', content: message });
        chatHistory.messages.push({ role: 'model', content: responseText });
        
        // Keep array size reasonable
        if (chatHistory.messages.length > 50) {
            chatHistory.messages = chatHistory.messages.slice(chatHistory.messages.length - 50);
        }

        await chatHistory.save();

        res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("AI Copilot Error:", error);
        res.status(500).json({ message: 'Error communicating with AI Copilot', error: error.message });
    }
};

export const getCopilotHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user.id;

        const chatHistory = await AiChatHistory.findOne({ studentId, sessionId });
        
        if (!chatHistory) {
            return res.status(200).json({ messages: [] });
        }

        res.status(200).json({ messages: chatHistory.messages });
    } catch (error) {
        console.error("Get AI History Error:", error);
        res.status(500).json({ message: 'Server error fetching history' });
    }
};

export const clearCopilotHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user.id;

        await AiChatHistory.findOneAndUpdate(
            { studentId, sessionId },
            { $set: { messages: [] } }
        );

        res.status(200).json({ message: 'History cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Server error clearing history' });
    }
};

export const generateQuiz = async (req, res) => {
    try {
        // Only tutor can access
        const { topic, difficulty, questionCount, type } = req.body;

        if (!topic || !difficulty || !questionCount || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (questionCount > 15) {
            return res.status(400).json({ message: 'Maximum 15 questions allowed per generation' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        const prompt = `You are an expert curriculum developer. Generate a quiz about "${topic}".
Difficulty: ${difficulty}. 
Type: ${type}.
Number of questions: ${questionCount}.
Format the output STRICTLY as a JSON array of objects. Do not include markdown code blocks like \`\`\`json. Just the raw JSON.
Each object must have the following keys:
- questionText: (string) The question.
- options: (array of 4 strings) The possible answers.
- correctAnswer: (string) Must exactly match one of the options.
- explanation: (string) Why this is the correct answer.`;

        let responseText = "";
        try {
            if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'fake-key-for-now') {
                const result = await model.generateContent(prompt);
                responseText = result.response.text();
            } else {
                throw new Error("Fake API key used");
            }
        } catch (e) {
            console.log("Mocking AI Quiz response due to error or missing API key:", e.message);
            // Mock output
            const mockQuestions = Array.from({ length: questionCount }).map((_, i) => ({
                questionText: `(Mock ${type} - ${difficulty}) Question ${i + 1} about ${topic}?`,
                options: ["Option A", "Option B", "Option C", "Option D"],
                correctAnswer: "Option A",
                explanation: `This is a mock explanation for question ${i + 1}.`
            }));
            return res.status(200).json({ questions: mockQuestions });
        }
        
        let questions;
        try {
            // Try parsing the JSON. Clean up any accidental markdown blocks.
            let cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            questions = JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse AI JSON:", responseText);
            return res.status(500).json({ message: 'AI generated invalid format. Please try again.' });
        }

        res.status(200).json({ questions });

    } catch (error) {
        console.error("AI Quiz Gen Error:", error);
        res.status(500).json({ message: 'Error generating quiz', error: error.message });
    }
};
