const express = require('express');
const path = require('path');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const Source = require('../models/Source');
const { parseSourcesFolder, parseUploadedFile } = require('../services/sourceParser');

// Multer: keep files in memory (no disk write needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.csv', '.pdf', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`), false);
    }
  },
});

const router = express.Router();

/**
 * Shared upsert logic — takes parsed source array, upserts to DB
 */
async function upsertSources(sources) {
  let created = 0, updated = 0, skipped = 0;
  for (const source of sources) {
    try {
      const result = await Source.findOneAndUpdate(
        { email: source.email },
        { $set: source },
        { upsert: true, new: true, rawResult: true }
      );
      if (result.lastErrorObject?.updatedExisting) updated++;
      else created++;
    } catch (err) {
      skipped++;
    }
  }
  return { created, updated, skipped };
}

// POST /api/sources/upload - Upload multiple files (txt/csv/pdf/xlsx), parse & upsert to DB
// Files are named by country: INDIA.txt, US.xlsx, UK2.pdf etc.
router.post('/upload', requireAuth, upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    console.log('[Sources] Upload triggered by:', req.user.email, '|', req.files.length, 'file(s)');

    let allSources = [];

    for (const file of req.files) {
      try {
        const parsed = await parseUploadedFile(file.originalname, file.buffer);
        allSources = allSources.concat(parsed);
      } catch (err) {
        console.error('[Sources] Error parsing uploaded file:', file.originalname, err.message);
      }
    }

    if (allSources.length === 0) {
      return res.status(400).json({ error: 'No valid contacts found in uploaded files.' });
    }

    const { created, updated, skipped } = await upsertSources(allSources);

    console.log('[Sources] Upload complete:', { totalParsed: allSources.length, created, updated, skipped });
    res.json({
      message: 'Sources uploaded and synced successfully.',
      files: req.files.map(f => f.originalname),
      totalParsed: allSources.length,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    console.error('[Sources] Upload error:', error.message);
    res.status(500).json({ error: 'Failed to upload and sync sources.' });
  }
});

// POST /api/sources/sync - Scan sources/ folder, parse all files, upsert to DB
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const sourcesDir = path.join(__dirname, '../../../sources');
    console.log('[Sources] Sync triggered by:', req.user.email, '| scanning:', sourcesDir);
    const parsed = await parseSourcesFolder(sourcesDir);

    if (parsed.length === 0) {
      return res.status(404).json({ error: 'No valid sources found in sources/ folder.' });
    }

    const { created, updated, skipped } = await upsertSources(parsed);

    console.log('[Sources] Sync complete:', { totalParsed: parsed.length, created, updated, skipped });
    res.json({
      message: 'Sources synced successfully.',
      totalParsed: parsed.length,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    console.error('[Sources] Sync error:', error.message);
    res.status(500).json({ error: 'Failed to sync sources.' });
  }
});

// GET /api/sources/countries - Get distinct countries with counts
router.get('/countries', requireAuth, async (req, res) => {
  try {
    const countries = await Source.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ countries });
  } catch (error) {
    console.error('[Sources] Error fetching countries:', error.message);
    res.status(500).json({ error: 'Failed to fetch countries.' });
  }
});

// GET /api/sources/stats - Get source statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const totalContacts = await Source.countDocuments({ isActive: true });
    const byCountry = await Source.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const byType = await Source.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$companyType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ totalContacts, byCountry, byType });
  } catch (error) {
    console.error('[Sources] Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch source stats.' });
  }
});

module.exports = router;
