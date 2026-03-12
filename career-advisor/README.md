# 🎯 CareerLens AI — AI Career Advisor for Students

An AI-powered web app that helps students discover their ideal career paths based on their skills, interests, courses studied, and personality type.

## ✨ Features

- **Tag-based Input System** — Add skills, interests, and courses as interactive tags
- **Personality Profiling** — Choose from 6 personality types to refine career matches
- **AI Career Report** powered by Google Gemini, including:
  - 🎯 Top 3 career paths with descriptions
  - 💰 Salary estimates (entry-level and mid-career)
  - 📈 Job market demand indicators
  - ⚡ Skills to develop for each career path
  - 🗺️ 6-month personalized learning roadmap

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **AI:** Google Gemini API (`gemini-2.5-flash`)
- **Build:** Vite
- **Design:** Dark mode, glassmorphism, Inter font

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- A Google Gemini API key

### Setup

1. Clone the repository and navigate to the project:
   ```bash
   cd career-advisor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173` in your browser.

## 📖 How to Use

1. Add your **skills** (e.g., Python, Excel, Public Speaking)
2. Add your **interests** (e.g., AI, Finance, Design)
3. Add your **courses studied** (e.g., Data Structures, Marketing 101)
4. Select your **personality type**
5. Click **Generate Career Report**
6. Review your personalized career advice and roadmap!

## 📄 License

For educational purposes only.
