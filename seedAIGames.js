
import dns from 'node:dns';

dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
]);


import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CodingGame from './models/CodingGameModel.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const GAME_TYPES = ['fill-blank', 'bug-hunt', 'output-predict', 'code-reorder'];

async function generateBatch(gameType, count) {
    const prompt = `You are an expert programming instructor. Generate exactly ${count} unique coding challenges for students.
    Language must be one of: python, javascript, html, sql, reactjs, nodejs, expressjs, mongodb, java, machinelearning, powerbi, css, git, typescript (pick randomly but balance them).
    Game Type MUST be: ${gameType}.
    Return ONLY a valid JSON array of objects.
    
    Each object must have:
    - title: String (Short catchy title)
    - description: String (Clear instruction)
    - language: String (lowercase: python, javascript, html, sql, reactjs, nodejs, expressjs, mongodb, java, machinelearning, powerbi, css, git, typescript)
    - gameType: String (exactly '${gameType}')
    - difficulty: String (easy, medium, or hard)
    - starterCode: String (optional base code, or empty string)
    - explanation: String (Explain the concept and the correct answer clearly)
    
    AND one of the following objects based on gameType:
    
    If gameType is 'fill-blank':
    - fillBlankData: { 
        codeSnippet: String (use '___' for blanks), 
        blanks: [ { id: String (e.g. 'blank-1'), placeholder: String, answer: String, options: [String] } ] 
      }
      
    If gameType is 'bug-hunt':
    - bugHuntData: { 
        buggyCode: String, 
        hint: String, 
        correctCode: String, 
        correction: String (explain the fix) 
      }
      
    If gameType is 'output-predict':
    - outputPredictData: { 
        code: String, 
        options: [String] (at least 4 options), 
        correctAnswer: String (must match one option exactly) 
      }
      
    If gameType is 'code-reorder':
    - codeReorderData: { 
        goal: String,
        lines: [ { id: String (e.g. 'line-1'), code: String (the line of code), correctPosition: Number (0-indexed position) } ] 
      }
      
    Ensure the JSON is perfectly valid and properties match exactly. Do not include markdown formatting like \`\`\`json, just return the raw JSON array string.`;

    const model = genAI.getGenerativeModel({ 
        model: "gemini-3.6-flash", 
        generationConfig: { responseMimeType: "application/json" } 
    });
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Target count per mode. 
        // We will generate 30 per mode in this batch to stay within safe API limits per minute.
        const TARGET_PER_MODE = 30; 
        
        for (const type of GAME_TYPES) {
            console.log(`Generating ${TARGET_PER_MODE} challenges for ${type}...`);
            try {
                const batch = await generateBatch(type, TARGET_PER_MODE);
                
                let savedCount = 0;
                for (const item of batch) {
                    const game = new CodingGame(item);
                    await game.save();
                    savedCount++;
                }
                console.log(`✅ Successfully saved ${savedCount} games for ${type}`);
            } catch (e) {
                console.error(`❌ Error for ${type}:`, e.message);
            }
        }
        
        console.log('🎉 AI Question Seeding Complete!');
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        process.exit(0);
    }
}

run();
