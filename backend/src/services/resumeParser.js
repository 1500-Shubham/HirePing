const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Parse a PDF resume file and extract raw text
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {string} Raw text content of the PDF
 */
async function parseResumeFile(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('[ResumeParser] Error parsing PDF:', error.message);
    throw new Error('Failed to parse PDF file');
  }
}

module.exports = { parseResumeFile };
