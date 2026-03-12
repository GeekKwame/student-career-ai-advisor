import { GoogleGenerativeAI } from "@google/generative-ai"

// ===== State =====
const state = {
  skills: [],
  interests: [],
  courses: [],
  personality: ''
}

// ===== DOM References =====
const actionPanel   = document.getElementById('action-panel')
const loadingPanel  = document.getElementById('loading-panel')
const outputPanel   = document.getElementById('output-panel')
const loadingMsg    = document.getElementById('loading-message')
const generateBtn   = document.getElementById('generate-btn')
const startOverBtn  = document.getElementById('start-over-btn')
const personalityEl = document.getElementById('personality-select')
const reportContent = document.getElementById('report-content')

// ===== Tag System =====
// Each category: { formId, inputId, tagsDisplayId, stateKey }
const categories = [
  { formId: 'skills-form',    inputId: 'skills-input',    tagsId: 'skills-tags',    key: 'skills' },
  { formId: 'interests-form', inputId: 'interests-input', tagsId: 'interests-tags', key: 'interests' },
  { formId: 'courses-form',   inputId: 'courses-input',   tagsId: 'courses-tags',   key: 'courses' },
]

categories.forEach(cat => {
  const form  = document.getElementById(cat.formId)
  const input = document.getElementById(cat.inputId)

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const value = input.value.trim()
    if (value && !state[cat.key].includes(value)) {
      state[cat.key].push(value)
      input.value = ''
      renderTags(cat.key, cat.tagsId)
      clearError(input.closest('.input-group'))
      validateForm()
    }
  })
})

function renderTags(stateKey, tagsContainerId) {
  const container = document.getElementById(tagsContainerId)
  container.innerHTML = ''

  state[stateKey].forEach((item, index) => {
    const tag = document.createElement('span')
    tag.className = 'tag'
    tag.innerHTML = `${escapeHTML(item)} <button class="remove-tag" aria-label="Remove ${escapeHTML(item)}">&times;</button>`

    tag.querySelector('.remove-tag').addEventListener('click', () => {
      state[stateKey].splice(index, 1)
      renderTags(stateKey, tagsContainerId)
      validateForm()
    })

    container.appendChild(tag)
  })
}

function escapeHTML(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// ===== Personality Select =====
personalityEl.addEventListener('change', () => {
  state.personality = personalityEl.value
  clearError(personalityEl.closest('.input-group'))
  validateForm()
})

// ===== Validation =====
function validateForm() {
  const isValid =
    state.skills.length > 0 &&
    state.interests.length > 0 &&
    state.courses.length > 0 &&
    state.personality !== ''

  generateBtn.disabled = !isValid
}

function clearError(group) {
  group.classList.remove('error')
  const existing = group.querySelector('.error-msg')
  if (existing) existing.remove()
}

// ===== Generate Report =====
generateBtn.addEventListener('click', generateReport)
startOverBtn.addEventListener('click', startOver)

async function generateReport() {
  // Validate one more time and show errors
  let hasError = false

  if (state.skills.length === 0) {
    showError('skills-input', 'Add at least one skill')
    hasError = true
  }
  if (state.interests.length === 0) {
    showError('interests-input', 'Add at least one interest')
    hasError = true
  }
  if (state.courses.length === 0) {
    showError('courses-input', 'Add at least one course')
    hasError = true
  }
  if (!state.personality) {
    showError('personality-select', 'Select your personality type')
    hasError = true
  }

  if (hasError) return

  // Switch to loading panel
  actionPanel.style.display = 'none'
  loadingPanel.style.display = 'flex'

  loadingMsg.textContent = 'Analyzing your profile...'

  try {
    await fetchCareerReport()
  } catch (err) {
    console.error('Error generating report:', err)
    loadingPanel.style.display = 'none'
    outputPanel.style.display = 'flex'
    reportContent.innerHTML = `
      <h2 style="color: #fca5a5;">⚠️ Something went wrong</h2>
      <p>Unable to generate your career report. Please check your internet connection and try again.</p>
      <p style="font-size: 0.8rem; color: var(--text-muted);">Error: ${escapeHTML(err.message)}</p>
    `
  }
}

function showError(inputId, message) {
  const group = document.getElementById(inputId).closest('.input-group')
  group.classList.add('error')
  if (!group.querySelector('.error-msg')) {
    const msg = document.createElement('p')
    msg.className = 'error-msg'
    msg.textContent = message
    group.appendChild(msg)
  }
}

// ===== Gemini API =====
async function fetchCareerReport() {
  const prompt = buildPrompt()

  loadingMsg.textContent = 'Crafting your career roadmap...'

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    }
  })

  const chat  = model.startChat()
  const result = await chat.sendMessage(prompt)
  const text   = result.response.text()

  renderReport(text)
}

const SYSTEM_PROMPT = `You are an expert career counselor and job market analyst. Your task is to analyze a student's profile and provide detailed, actionable career guidance.

Respond ONLY in pure HTML. Do NOT wrap the response in markdown code blocks like \`\`\`html. 

Use semantic HTML tags to structure the report beautifully:
- <h2> for section headings (e.g. "🎯 Top Career Paths", "💰 Salary Estimates", "📈 Job Market Demand", "🗺️ 6-Month Learning Roadmap")
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

Make the report encouraging, specific, and actionable. Reference the student's actual skills and interests throughout. Use emojis sparingly to make it visually engaging.`

function buildPrompt() {
  return `Here is my student profile:

**Skills:** ${state.skills.join(', ')}
**Interests:** ${state.interests.join(', ')}
**Courses Studied:** ${state.courses.join(', ')}
**Personality Type:** ${state.personality}

Please analyze my profile and generate a comprehensive career advisory report.`
}

// ===== Render Report =====
function renderReport(htmlContent) {
  loadingPanel.style.display = 'none'
  outputPanel.style.display  = 'flex'
  reportContent.innerHTML    = htmlContent
}

// ===== Start Over =====
function startOver() {
  // Reset state
  state.skills    = []
  state.interests = []
  state.courses   = []
  state.personality = ''

  // Reset UI
  personalityEl.value = ''
  generateBtn.disabled = true

  categories.forEach(cat => {
    document.getElementById(cat.tagsId).innerHTML = ''
    document.getElementById(cat.inputId).value = ''
  })

  // Clear any errors
  document.querySelectorAll('.input-group').forEach(g => {
    g.classList.remove('error')
    const msg = g.querySelector('.error-msg')
    if (msg) msg.remove()
  })

  // Switch panels
  outputPanel.style.display  = 'none'
  loadingPanel.style.display = 'none'
  actionPanel.style.display  = 'block'

  reportContent.innerHTML = ''
}
