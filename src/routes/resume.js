require('dotenv').config();

const { extractText } = require('../utils/pdfParser');
const buildPrompt = require('../prompts/resumePrompt');

module.exports = async function (fastify, opts) {

  // Register multipart support
  fastify.register(require('@fastify/multipart'));

  fastify.post('/resume/upload', async (request, reply) => {
    try {
        console.log("request headers:", request.headers['content-type']);
      const data = await request.file();

      if (!data) {
        return { success: false, error: "No file uploaded" };
      }

      const buffer = await data.toBuffer();
      console.log("Received file:", data.filename, "size:", buffer.length);
      // Step 1: Extract text
      const text = await extractText(buffer);
      console.log("Extracted text:", text);

      if (!text || text.length < 20) {
        return { success: false, error: "Could not extract text from PDF" };
      }

      // Step 2: Build prompt
    //   const prompt = buildPrompt(text.slice(0, 8000)); // limit size
      const prompt = "Hi how are you"
        console.log("Generated prompt:", prompt);
      const apiKey = process.env.GEMINI_API_KEY;

      // Step 3: Call Gemini
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
        {
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
      console.log("Gemini response:", res);
      const geminiData = await res.json();
      console.log("Gemini data:", geminiData);
      let output =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Gemini output:", output);
      // Step 4: Try parsing JSON
      let parsed;
      try {
        parsed = JSON.parse(output);
      } catch (e) {
        return {
          success: false,
          error: "Invalid JSON from LLM",
          raw: output,
        };
      }

      return {
        success: true,
        profile: parsed,
      };

    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  });

};