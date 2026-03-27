const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractText(buffer) {
  try {
    // ✅ FIX: convert Buffer → Uint8Array
    const uint8Array = new Uint8Array(buffer);

    const pdf = await pdfjsLib.getDocument({
      data: uint8Array,
    }).promise;

    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n';
    }

    return text.trim();

  } catch (err) {
    console.error("PDF parse error:", err);
    return '';
  }
}

module.exports = { extractText };