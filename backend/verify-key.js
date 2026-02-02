const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function verifyKey() {
  try {
    console.log("Testing new key with gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, are you active?");
    console.log("✅ SUCCESS!");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

verifyKey();
