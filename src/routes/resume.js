require('dotenv').config();

const { extractText } = require('../utils/pdfParser');
const buildPrompt = require('../prompts/resumePrompt');

function extractJsonFromString(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // Remove markdown fences if present
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();

  // Extract first JSON object or array from text
  const match = cleaned.match(/({[\s\S]*}|\[[\s\S]*\])/);
  if (match) {
    cleaned = match[0].trim();
  }

  return cleaned;
}

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
      // console.log("Received file:", data.filename, "size:", buffer.length);
      // Step 1: Extract text
      const text = await extractText(buffer);
      // console.log("Extracted text:", text);

      if (!text || text.length < 20) {
        return { success: false, error: "Could not extract text from PDF" };
      }

      // Step 2: Build prompt
      const prompt = buildPrompt(text.slice(0, 8000)); // limit size
      // const prompt = "Hi how are you"
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
      console.log("Gemini response status:", res.status, res.statusText);
      const geminiData = await res.json();
      console.log("Gemini data:", geminiData);
      let output =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Gemini output:", output);
      // Step 4: Try parsing JSON
      let parsed;
      try {
        const cleanedOutput = extractJsonFromString(output);
        parsed = JSON.parse(cleanedOutput);
      } catch (e) {
        return {
          success: false,
          error: "Invalid JSON from LLM",
          raw: output,
          details: e.message,
          prompt: prompt,
        };
      }

      return {
        success: true,
        profile: parsed,
        prompt: prompt,
        raw: output,
      };

    } catch (err) {
      return {
        success: false,
        error: err.message,
        prompt: prompt,
      };
    }
  });

};