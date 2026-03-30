const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');

/**
 * Parse all source files from a directory.
 *
 * Supported formats: .txt, .csv, .pdf, .xlsx, .xls
 *
 * Country detection:
 *   1. From filename — INDIA.txt → "INDIA", US2.csv → "US" (trailing numbers stripped)
 *   2. If a row has a "country" column, that value overrides the filename country
 *
 * Data flexibility:
 *   - Full CSV:   name,email,role,company,companyType,country
 *   - Partial:    name,email
 *   - Minimal:    just an email address per line
 *   - Fields that are missing get sensible defaults
 */
async function parseSourcesFolder(sourcesDir) {
  if (!fs.existsSync(sourcesDir)) {
    console.log('[SourceParser] Directory not found:', sourcesDir);
    return [];
  }

  const files = fs.readdirSync(sourcesDir);
  const allSources = [];

  console.log('[SourceParser] Scanning directory:', sourcesDir);
  console.log('[SourceParser] Found files:', files.join(', '));

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.txt', '.csv', '.pdf', '.xlsx', '.xls'].includes(ext)) {
      console.log('[SourceParser] Skipping unsupported file:', file);
      continue;
    }

    // Country from filename: "INDIA.txt" → "INDIA", "INDIA2.txt" → "INDIA"
    const basename = path.basename(file, ext);
    const fileCountry = basename.replace(/[0-9]+$/, '').toUpperCase();
    const filePath = path.join(sourcesDir, file);

    console.log('[SourceParser] Parsing file:', file, '| country from name:', fileCountry);

    let rows = [];

    try {
      if (ext === '.xlsx' || ext === '.xls') {
        rows = parseExcel(filePath);
      } else if (ext === '.pdf') {
        rows = await parsePdf(filePath);
      } else {
        rows = parseText(filePath);
      }
    } catch (err) {
      console.error('[SourceParser] Error parsing', file, ':', err.message);
      continue;
    }

    console.log('[SourceParser] Extracted', rows.length, 'rows from', file);

    for (const row of rows) {
      const source = normalizeRow(row, fileCountry);
      if (source) allSources.push(source);
    }
  }

  console.log('[SourceParser] Total valid sources parsed:', allSources.length);
  return allSources;
}

/**
 * Parse a text/CSV file into row objects.
 * Handles: full CSV, partial CSV, or just email-per-line.
 */
function parseText(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // Detect if first line is a header
  let headers = null;
  let startIdx = 0;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('name') && firstLine.includes('email')) {
    headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    startIdx = 1;
  } else if (firstLine.includes('email')) {
    headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    startIdx = 1;
  }

  const rows = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is just a single email address
    if (!line.includes(',') && line.includes('@')) {
      rows.push({ email: line });
      continue;
    }

    const parts = line.split(',').map(p => p.trim());

    if (headers) {
      // Map by header names
      const obj = {};
      headers.forEach((h, idx) => {
        if (idx < parts.length) obj[h] = parts[idx];
      });
      rows.push(obj);
    } else {
      // Positional: name, email, role, company, companyType, country
      const [name, email, role, company, companyType, country] = parts;
      rows.push({ name, email, role, company, companyType, country });
    }
  }

  return rows;
}

/**
 * Parse an Excel file into row objects.
 * Reads first sheet, uses first row as headers if they contain "email".
 */
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Try header detection: if first row has "email", use as headers
  const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (jsonRows.length === 0) return [];

  // Normalize header keys to lowercase
  return jsonRows.map(row => {
    const normalized = {};
    for (const [key, val] of Object.entries(row)) {
      normalized[key.toLowerCase().trim()] = String(val).trim();
    }
    return normalized;
  });
}

/**
 * Parse a PDF file into row objects.
 * Extracts text, splits by newlines, treats each line as CSV or standalone email.
 */
async function parsePdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const text = pdfData.text;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  const rows = [];

  // Detect header
  let startIdx = 0;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('name') && firstLine.includes('email')) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // Standalone email
    if (!line.includes(',') && line.includes('@')) {
      rows.push({ email: line });
      continue;
    }

    // CSV-like line
    if (line.includes(',')) {
      const parts = line.split(',').map(p => p.trim());
      const [name, email, role, company, companyType, country] = parts;
      rows.push({ name, email, role, company, companyType, country });
      continue;
    }

    // Might be space/tab separated with an email somewhere
    const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      rows.push({ email: emailMatch[0] });
    }
  }

  return rows;
}

/**
 * Normalize a parsed row into a clean source object.
 * Returns null if no valid email found.
 */
function normalizeRow(row, fileCountry) {
  // Find the email — try common field names
  let email = row.email || row.Email || row.EMAIL || row['email address'] || row['e-mail'] || '';
  email = email.toLowerCase().trim();

  if (!email || !email.includes('@')) return null;

  const name = row.name || row.Name || row.NAME || '';
  const role = row.role || row.Role || row.ROLE || row.designation || row.Designation || '';
  const company = row.company || row.Company || row.COMPANY || row.organization || '';
  const companyType = row.companytype || row.companyType || row.CompanyType || row.company_type || row.type || '';
  const country = row.country || row.Country || row.COUNTRY || '';

  const validTypes = ['startup', 'mnc', 'mid-size'];
  const normalizedType = companyType ? companyType.toLowerCase().trim() : '';

  return {
    name: name || 'Unknown',
    email,
    role: role || 'HR',
    company: company || 'Unknown',
    companyType: validTypes.includes(normalizedType) ? normalizedType : 'startup',
    country: country ? country.toUpperCase().trim() : fileCountry,
  };
}

/**
 * Parse a single uploaded file buffer into source objects.
 * @param {string} originalName - Original filename (used for country detection)
 * @param {Buffer} buffer - File content buffer
 * @returns {Array} Array of source objects
 */
async function parseUploadedFile(originalName, buffer) {
  const ext = path.extname(originalName).toLowerCase();
  const basename = path.basename(originalName, ext);
  const fileCountry = basename.replace(/[0-9]+$/, '').toUpperCase();

  console.log('[SourceParser] Parsing uploaded file:', originalName, '| country from name:', fileCountry);

  let rows = [];

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    rows = jsonRows.map(row => {
      const normalized = {};
      for (const [key, val] of Object.entries(row)) {
        normalized[key.toLowerCase().trim()] = String(val).trim();
      }
      return normalized;
    });
  } else if (ext === '.pdf') {
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let startIdx = 0;
    if (lines.length > 0 && lines[0].toLowerCase().includes('name') && lines[0].toLowerCase().includes('email')) {
      startIdx = 1;
    }
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes(',') && line.includes('@')) {
        rows.push({ email: line });
      } else if (line.includes(',')) {
        const parts = line.split(',').map(p => p.trim());
        const [name, email, role, company, companyType, country] = parts;
        rows.push({ name, email, role, company, companyType, country });
      } else {
        const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) rows.push({ email: emailMatch[0] });
      }
    }
  } else {
    // .txt, .csv
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    let headers = null;
    let startIdx = 0;
    const firstLine = lines[0].toLowerCase();
    if ((firstLine.includes('name') && firstLine.includes('email')) || firstLine.includes('email')) {
      headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes(',') && line.includes('@')) {
        rows.push({ email: line });
        continue;
      }
      const parts = line.split(',').map(p => p.trim());
      if (headers) {
        const obj = {};
        headers.forEach((h, idx) => { if (idx < parts.length) obj[h] = parts[idx]; });
        rows.push(obj);
      } else {
        const [name, email, role, company, companyType, country] = parts;
        rows.push({ name, email, role, company, companyType, country });
      }
    }
  }

  console.log('[SourceParser] Extracted', rows.length, 'rows from uploaded file:', originalName);

  const sources = [];
  for (const row of rows) {
    const source = normalizeRow(row, fileCountry);
    if (source) sources.push(source);
  }

  console.log('[SourceParser] Valid sources from', originalName, ':', sources.length);
  return sources;
}

module.exports = { parseSourcesFolder, parseUploadedFile };
