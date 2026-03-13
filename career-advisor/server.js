import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// ===== Middleware =====

app.use(cors())
app.use(express.json())

// Rate limiting: 10 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait 15 minutes before generating another report.'
  }
})

// ===== System Prompt =====

const SYSTEM_PROMPT = `You are an expert career counselor and job market analyst. Your task is to analyze a student's profile and provide detailed, actionable career guidance.

Respond ONLY in pure HTML. Do NOT wrap the response in markdown code blocks like \`\`\`html.

Use semantic HTML tags to structure the report beautifully:
- <h2> for section headings (e.g. "Top Career Paths", "Salary Estimates", "Job Market Demand", "6-Month Learning Roadmap")
- <h3> for sub-headings (career path names)
- <p>, <strong>, <em> for body text
- <table>, <thead>, <tbody>, <tr>, <th>, <td> for salary/demand data
- <ul>/<ol> and <li> for lists
- <hr> to separate major sections

The report MUST include ALL of the following sections:

1. **Top 3 Career Paths** — with a brief description of why each is a good fit
2. **Salary Estimates** — expected entry-level and mid-career salaries for each path (in a table)
3. **Skills to Develop** — specific technical and soft skills the student should learn, tied to each career path
4. **Job Market Demand** — current and projected demand for each career path (High / Medium / Low with brief explanation)
5. **6-Month Learning Roadmap** — a detailed, month-by-month plan with specific courses, projects, and milestones to pursue

Make the report encouraging, specific, and actionable. Reference the student's actual skills and interests throughout.`

// ===== API Route =====

app.post('/api/career-report', apiLimiter, async (req, res) => {
  const { skills, interests, courses, personality } = req.body

  // Validate inputs
  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ error: 'At least one skill is required.' })
  }
  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    return res.status(400).json({ error: 'At least one interest is required.' })
  }
  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: 'At least one course is required.' })
  }
  if (!personality || typeof personality !== 'string') {
    return res.status(400).json({ error: 'Personality type is required.' })
  }

  // Sanitize inputs (strip HTML tags)
  const clean = (arr) => arr.map(s => String(s).replace(/<[^>]*>/g, '').trim()).filter(Boolean)
  const cleanSkills = clean(skills)
  const cleanInterests = clean(interests)
  const cleanCourses = clean(courses)
  const cleanPersonality = String(personality).replace(/<[^>]*>/g, '').trim()

  const prompt = `Here is my student profile:

**Skills:** ${cleanSkills.join(', ')}
**Interests:** ${cleanInterests.join(', ')}
**Courses Studied:** ${cleanCourses.join(', ')}
**Personality Type:** ${cleanPersonality}

Please analyze my profile and generate a comprehensive career advisory report.`

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
    })

    const chat = model.startChat()
    const result = await chat.sendMessage(prompt)
    const html = result.response.text()

    res.json({ report: html })
  } catch (err) {
    console.error('Gemini API error:', err.message)
    res.status(500).json({ error: 'Failed to generate career report. Please try again.' })
  }
})

// ===== Start =====

app.listen(PORT, () => {
  console.log(`Career Advisor API running on http://localhost:${PORT}`)
})
