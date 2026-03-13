import DOMPurify from 'https://esm.sh/dompurify@3.2.4'

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
const loadingSub    = document.getElementById('loading-sub')
const generateBtn   = document.getElementById('generate-btn')
const startOverBtn  = document.getElementById('start-over-btn')
const downloadBtn   = document.getElementById('download-btn')
const personalityEl = document.getElementById('personality-select')
const reportContent = document.getElementById('report-content')
const historySection = document.getElementById('history-section')
const historyList    = document.getElementById('history-list')

// ===== Tag System =====
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

    const text = document.createTextNode(item + ' ')
    tag.appendChild(text)

    const removeBtn = document.createElement('button')
    removeBtn.className = 'remove-tag'
    removeBtn.setAttribute('aria-label', `Remove ${item}`)
    removeBtn.textContent = '×'
    removeBtn.addEventListener('click', () => {
      state[stateKey].splice(index, 1)
      renderTags(stateKey, tagsContainerId)
      validateForm()
    })

    tag.appendChild(removeBtn)
    container.appendChild(tag)
  })
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

// ===== Rotating Loading Messages =====
const LOADING_MESSAGES = [
  { main: 'Analyzing your profile...', sub: 'Reviewing your skills and interests' },
  { main: 'Researching career paths...', sub: 'Matching your profile to job markets' },
  { main: 'Estimating salaries...', sub: 'Pulling compensation data for top roles' },
  { main: 'Building your roadmap...', sub: 'Designing a 6-month learning plan' },
  { main: 'Almost there...', sub: 'Putting the finishing touches on your report' },
]

let loadingInterval = null
let messageIndex = 0

function startLoadingMessages() {
  messageIndex = 0
  updateLoadingMessage()
  loadingInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length
    updateLoadingMessage()
  }, 3000)
}

function stopLoadingMessages() {
  if (loadingInterval) {
    clearInterval(loadingInterval)
    loadingInterval = null
  }
}

function updateLoadingMessage() {
  const msg = LOADING_MESSAGES[messageIndex]
  loadingMsg.textContent = msg.main
  loadingSub.textContent = msg.sub
}

// ===== Generate Report =====
generateBtn.addEventListener('click', generateReport)
startOverBtn.addEventListener('click', startOver)
downloadBtn.addEventListener('click', downloadPDF)

async function generateReport() {
  // Validate
  let hasError = false
  if (state.skills.length === 0) { showError('skills-input', 'Add at least one skill'); hasError = true }
  if (state.interests.length === 0) { showError('interests-input', 'Add at least one interest'); hasError = true }
  if (state.courses.length === 0) { showError('courses-input', 'Add at least one course'); hasError = true }
  if (!state.personality) { showError('personality-select', 'Select your personality type'); hasError = true }
  if (hasError) return

  // Switch to loading
  actionPanel.style.display = 'none'
  loadingPanel.style.display = 'flex'
  startLoadingMessages()

  // Timeout controller (45 seconds)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000)

  try {
    const response = await fetch('/api/career-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skills: state.skills,
        interests: state.interests,
        courses: state.courses,
        personality: state.personality
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (response.status === 429) {
      throw new Error('You\'ve made too many requests. Please wait 15 minutes and try again.')
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || 'Server error. Please try again.')
    }

    const data = await response.json()

    // Sanitize the HTML output with DOMPurify
    const cleanHTML = DOMPurify.sanitize(data.report, {
      ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','strong','em','b','i','u','br','hr',
                     'ul','ol','li','table','thead','tbody','tr','th','td','span','div','a','blockquote'],
      ALLOWED_ATTR: ['href','target','class','style']
    })

    renderReport(cleanHTML)
    saveToHistory(cleanHTML)
  } catch (err) {
    clearTimeout(timeout)
    stopLoadingMessages()

    const isTimeout = err.name === 'AbortError'
    const errorMsg = isTimeout
      ? 'The request timed out. The AI is taking too long — please try again.'
      : err.message

    loadingPanel.style.display = 'none'
    outputPanel.style.display = 'flex'
    reportContent.innerHTML = `
      <div class="error-report">
        <h2>Something went wrong</h2>
        <p>${DOMPurify.sanitize(errorMsg)}</p>
        <button class="retry-btn" id="retry-btn" type="button">Try Again</button>
      </div>
    `
    document.getElementById('retry-btn').addEventListener('click', retryReport)
  }
}

function retryReport() {
  outputPanel.style.display = 'none'
  reportContent.innerHTML = ''
  generateReport()
}

// ===== Render Report =====
function renderReport(htmlContent) {
  stopLoadingMessages()
  loadingPanel.style.display = 'none'
  outputPanel.style.display = 'flex'
  reportContent.innerHTML = htmlContent
}

// ===== Download PDF =====
function downloadPDF() {
  window.print()
}

// ===== Start Over =====
function startOver() {
  state.skills = []
  state.interests = []
  state.courses = []
  state.personality = ''

  personalityEl.value = ''
  generateBtn.disabled = true

  categories.forEach(cat => {
    document.getElementById(cat.tagsId).innerHTML = ''
    document.getElementById(cat.inputId).value = ''
  })

  document.querySelectorAll('.input-group').forEach(g => {
    g.classList.remove('error')
    const msg = g.querySelector('.error-msg')
    if (msg) msg.remove()
  })

  outputPanel.style.display = 'none'
  loadingPanel.style.display = 'none'
  actionPanel.style.display = 'block'
  reportContent.innerHTML = ''
}

// ===== Report History (localStorage) =====
const HISTORY_KEY = 'careerlens_history'

function saveToHistory(reportHTML) {
  const history = getHistory()
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    skills: [...state.skills],
    interests: [...state.interests],
    personality: state.personality,
    report: reportHTML
  }

  history.unshift(entry)
  // Keep only the last 10 reports
  if (history.length > 10) history.pop()

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch (e) {
    // localStorage might be full — silently fail
    console.warn('Could not save to history:', e.message)
  }

  renderHistory()
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch {
    return []
  }
}

function renderHistory() {
  const history = getHistory()

  if (history.length === 0) {
    historySection.style.display = 'none'
    return
  }

  historySection.style.display = 'block'
  historyList.innerHTML = ''

  history.forEach((entry) => {
    const li = document.createElement('li')
    li.className = 'history-item'

    const label = document.createElement('button')
    label.className = 'history-btn'
    label.innerHTML = `<span class="history-date">${entry.date}</span><span class="history-tags">${entry.skills.slice(0, 3).join(', ')}${entry.skills.length > 3 ? '…' : ''}</span>`

    label.addEventListener('click', () => {
      actionPanel.style.display = 'none'
      renderReport(entry.report)
    })

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'history-delete'
    deleteBtn.textContent = '×'
    deleteBtn.setAttribute('aria-label', 'Delete report')
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      removeFromHistory(entry.id)
    })

    li.appendChild(label)
    li.appendChild(deleteBtn)
    historyList.appendChild(li)
  })
}

function removeFromHistory(id) {
  const history = getHistory().filter(e => e.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  renderHistory()
}

// Initialize history on load
renderHistory()
