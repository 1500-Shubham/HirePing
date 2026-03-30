const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { parseResumeFile } = require('../services/resumeParser');
const { parseResume } = require('../services/gemini');
const User = require('../models/User');

const router = express.Router();

// Configure multer for PDF uploads to temp uploads/ dir
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'), false);
    }
  },
});

// POST /api/resume/upload - Upload and parse resume PDF
router.post('/upload', requireAuth, upload.single('resume'), async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    tempFilePath = req.file.path;
    console.log('[Resume] File uploaded:', req.file.originalname, '| size:', req.file.size, 'bytes');

    // Extract text from PDF using pdf-parse
    const rawText = await parseResumeFile(tempFilePath);
    console.log('[Resume] Extracted text length:', rawText ? rawText.length : 0, 'chars');

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from PDF. Ensure the file is not scanned/image-based.' });
    }

    // Send text to Gemini for structured parsing
    console.log('[Resume] Sending to Gemini for parsing...');
    const geminiResult = await parseResume(rawText);

    if (!geminiResult) {
      return res.status(500).json({ error: 'Failed to parse resume with AI. Please try again.' });
    }

    console.log('[Resume] Gemini parsed:', JSON.stringify({
      name: geminiResult.name,
      skills: geminiResult.skills?.length || 0,
      education: geminiResult.education?.length || 0,
      experience: geminiResult.experience?.length || 0,
    }));

    // Build update: merge parsed data into user.profile fields
    const updateFields = {
      'resume.filename': req.file.originalname,
      'resume.uploadedAt': new Date(),
      'resume.parsedData': geminiResult,
    };

    // Map parsed fields to profile (overwrite)
    if (geminiResult.name) updateFields['profile.name'] = geminiResult.name;
    if (geminiResult.phone) updateFields['profile.phone'] = geminiResult.phone;
    if (geminiResult.location) updateFields['profile.location'] = geminiResult.location;
    if (geminiResult.summary) updateFields['profile.summary'] = geminiResult.summary;
    if (geminiResult.skills) updateFields['profile.skills'] = geminiResult.skills;
    if (geminiResult.education) updateFields['profile.education'] = geminiResult.education;
    if (geminiResult.experience) updateFields['profile.experience'] = geminiResult.experience;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      message: 'Resume uploaded and parsed successfully.',
      parsedData: geminiResult,
      profile: user.profile,
      resume: user.resume,
    });
  } catch (error) {
    console.error('[Resume] Error uploading resume:', error.message);
    if (error.message === 'Only PDF files are allowed.') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to upload and parse resume.' });
  } finally {
    // Delete the temp uploaded file after parsing
    if (tempFilePath) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error('[Resume] Failed to delete temp file:', err.message);
      });
    }
  }
});

module.exports = router;
