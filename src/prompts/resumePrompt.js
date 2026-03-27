module.exports = function buildResumePrompt(resumeText) {
  return `
You are an expert resume parser.

Extract structured information from the resume.

Return ONLY valid JSON. No explanation.

Rules:
- Do not hallucinate data
- If a field is missing, return null or empty array
- Keep output clean and consistent

Fields:
- name (string)
- email (string)
- phone (string)

- experience_years (number)

- current_role (string)
- seniority_level (junior | mid | senior)

- skills (array of strings)
- technologies (array of strings)

- past_companies (array of strings)

- education (string)

- projects_summary (2-3 lines)

- resume_summary (3-4 lines professional summary)

- tags (array of keywords like backend, frontend, java, react, devops)

Resume:
${resumeText}
`;
};