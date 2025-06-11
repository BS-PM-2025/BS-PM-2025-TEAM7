const OpenAI = require("openai");
const User = require("../models/user");

// Initialize OpenAI client directly
const openai = new OpenAI({
  apiKey: "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" 
});
console.log("API Key from ENV:", process.env.OPENAI_API_KEY ? "Exists" : "MISSING");
console.log("Key starts with:", process.env.OPENAI_API_KEY?.slice(0, 8));
exports.chatWithAI = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;
    
    // Get user info for context
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Prepare conversation context
    const context = `
      You're a CI/CD expert assistant. The user is a ${user.role} learning about:
      - Continuous Integration/Continuous Deployment
      - Authentication systems
      - DevOps best practices
      - GitHub Actions
      - Jenkins pipelines
      
      Current conversation:
      User: ${message}
      Assistant: 
    `;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are an expert CI/CD assistant. Provide clear, concise answers with practical examples."
        },
        { role: "user", content: context }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;
    res.json({ response: aiResponse });

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI service unavailable" });
  }
};