const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MOCK_PARSED_RESUME = {
  name: 'John Doe',
  phone: '+1-555-0100',
  location: 'San Francisco, CA',
  summary: 'Experienced software engineer with expertise in full-stack development.',
  skills: ['JavaScript', 'Node.js', 'React', 'Python', 'MongoDB', 'AWS'],
  education: [
    {
      degree: 'B.Tech in Computer Science',
      institution: 'Example University',
      year: '2022',
    },
  ],
  experience: [
    {
      title: 'Software Engineer',
      company: 'Tech Corp',
      duration: '2022 - Present',
      highlights: [
        'Built RESTful APIs serving 10k+ users',
        'Implemented CI/CD pipelines',
        'Led migration to microservices architecture',
      ],
    },
  ],
};

const MOCK_EMAIL = {
  subject: 'Exploring Opportunities at Your Company',
  body: `Dear Hiring Manager,

I hope this email finds you well. I am a software engineer with experience in full-stack development, and I am reaching out to express my interest in potential opportunities at your organization.

With my background in building scalable web applications and working with modern technologies, I believe I could contribute meaningfully to your team.

I would love the opportunity to discuss how my skills align with your current needs. I have attached my resume for your reference.

Thank you for your time and consideration.

Best regards`,
};

function isDummyApiKey() {
  const key = process.env.GEMINI_API_KEY;
  return !key || key === 'dummy-gemini-api-key' || key.startsWith('your-') || key.startsWith('dummy-');
}

/**
 * Parse resume text and return structured JSON profile
 * @param {string} text - Raw text extracted from resume PDF
 * @returns {object|null} Structured profile data or null on failure
 */
async function parseResume(text) {
  try {
    if (isDummyApiKey()) {
      console.log('[Gemini] Using mock data - API key is not configured');
      return MOCK_PARSED_RESUME;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Extract from this resume: name, phone, location, summary, skills[], education[{degree, institution, year}], experience[{title, company, duration, highlights[]}]. Return ONLY valid JSON, no markdown formatting, no code blocks.

Resume text:
${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Clean up response - remove markdown code blocks if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (error) {
    console.error('[Gemini] Error parsing resume:', error.message);
    return null;
  }
}

/**
 * Generate a tailored cold email for job application
 * @param {object} userProfile - User's profile data
 * @param {object} sourceInfo - Target source (HR/recruiter) info
 * @param {array} lastFiveEmails - Last 5 sent emails to avoid repetition
 * @returns {object|null} { subject, body } or null on failure
 */
async function generateEmail(userProfile, sourceInfo, lastFiveEmails = []) {
  try {
    if (isDummyApiKey()) {
      console.log('[Gemini] Using mock email - API key is not configured');
      // Personalize the mock email slightly
      const mock = { ...MOCK_EMAIL };
      mock.subject = `Interest in Opportunities at ${sourceInfo.company}`;
      mock.body = `Dear ${sourceInfo.name},

I hope this email finds you well. I came across ${sourceInfo.company} and was impressed by the work your team is doing. As a ${userProfile.summary || 'software professional'}, I am reaching out to explore potential opportunities that align with my skills.

${userProfile.skills && userProfile.skills.length > 0 ? `My key skills include ${userProfile.skills.slice(0, 5).join(', ')}.` : ''}

I would love the opportunity to discuss how I could contribute to ${sourceInfo.company}. I have attached my resume for your reference.

Thank you for your time and consideration.

Best regards,
${userProfile.name || 'Applicant'}`;
      return mock;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const previousEmails = lastFiveEmails.length > 0
      ? lastFiveEmails.map((e) => `Subject: ${e.subject}\nBody: ${e.body}`).join('\n---\n')
      : 'None';

    const prompt = `You are writing a job application email. 
User profile: ${JSON.stringify(userProfile)}
Sending to: ${sourceInfo.name} at ${sourceInfo.company} (${sourceInfo.role}).
Generate a professional cold email asking about job opportunities. 
It must NOT be similar to these previously sent emails: 
${previousEmails}
Keep it concise, professional, and personalized. 
Return ONLY valid JSON with {subject, body}. No markdown formatting, no code blocks.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (error) {
    console.error('[Gemini] Error generating email:', error.message);
    return null;
  }
}

module.exports = { parseResume, generateEmail };
