// Load env (MVP style - simple)
require('dotenv').config();

module.exports = async function (fastify, opts) {

  fastify.get('/gemini/test', async (request, reply) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: "Missing GEMINI_API_KEY in .env",
        };
      }

      const prompt = "Say hello and confirm Gemini API is working.";

     const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,  {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );

      const data = await res.json();

      return {
        success: true,
        data: data?.candidates?.[0]?.content?.parts?.[0]?.text || data,
      };

    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  });

};