module.exports = function buildResumePrompt(resumeText) {
  return `
You are an expert resume parser.

Extract structured information from the resume.

Return ONLY valid JSON object. No explanation, no markdown, no code fences, no extra text.

Rules:
- Do not hallucinate data.
- If a field is missing, return null or an empty array / empty object.
- Keep output clean and consistent.
- Use arrays of objects for repeated sections like education, experience, and projects.

Output schema:
- name (string or null)
- email (string or null)
- phone (string or null)
- location (string or null)
- profile_url (string or null)
- current_role (string or null)
- seniority_level (junior | mid | senior | null)
- experience_years (number or null)
- resume_summary (string or null)
- skills (array of strings)
- technologies (array of strings)
- tags (array of strings)
- past_companies (array of strings)
- certifications (array of strings)
- languages (array of strings)
- urls (array of strings)

education (array of objects):
- institution (string or null)
- degree (string or null)
- field_of_study (string or null)
- start_date (string or null)
- end_date (string or null)
- cgpa (string or null)
- location (string or null)

experience (array of objects):
- role (string or null)
- company (string or null)
- start_date (string or null)
- end_date (string or null)
- duration (string or null)
- location (string or null)
- summary (string or null)
- highlights (array of strings)

projects (array of objects):
- name (string or null)
- description (string or null)
- technologies (array of strings)
- link (string or null)

Resume:
${resumeText}
`;
};
