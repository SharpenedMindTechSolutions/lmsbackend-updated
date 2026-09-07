import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        if (data.error) {
             console.error("API Error:", data.error);
        } else {
             console.log("Available Models:");
             data.models.forEach(m => console.log(m.name));
        }
    } catch (e) {
        console.error(e);
    }
}
run();
