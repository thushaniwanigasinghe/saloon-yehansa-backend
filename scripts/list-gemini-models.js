const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: "../.env" });

async function listModels() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not defined in .env file");
      return;
    }
    const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await models.json();
    if (data.error) {
      console.error("API Error:", data.error.message);
      return;
    }
    const modelNames = data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name);
    console.log("Available Gemini Models:");
    console.log(modelNames);
  } catch (err) {
    console.error("Error fetching models:", err.message);
  }
}
listModels();
