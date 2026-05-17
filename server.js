// ============================================
// server.js
// Main entry point of the NeoBank backend
// This is where everything connects together
// Run with: npm start
// ============================================

import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import authRoutes from './routes/auth.js'
import transactionRoutes from './routes/transactions.js'
import User from './models/User.js'
import Transaction from './models/Transaction.js'
import jwt from 'jsonwebtoken'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app  = express()
const PORT = process.env.PORT || 3000

// ── MIDDLEWARE ──────────────────────────────
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// ── API ROUTES ──────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/transactions', transactionRoutes)

// DELETE ACCOUNT
app.delete('/api/auth/delete', async (req, res) => {
  try {
    let token
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }
    if (!token) return res.status(401).json({ success: false, message: 'No token' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Delete all user transactions
    await Transaction.deleteMany({
      $or: [{ sender: decoded.id }, { receiver: decoded.id }]
    })
    
    // Delete the user
    await User.findByIdAndDelete(decoded.id)

    res.json({ success: true, message: 'Account deleted successfully' })
  } catch(e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ── FRONTEND ROUTES ─────────────────────────
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
})

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'))
})

// NEWS ROUTE
app.get('/api/news', async (req, res) => {
  try {
    const response = await fetch(`https://api.marketaux.com/v1/news/all?topics=finance,banking,technology&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}`)
    const data = await response.json()
    res.json({ success: true, news: data.data || [] })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// AI ADVISOR ROUTE
app.post('/api/ai-advisor', async (req, res) => {
  const { message, context } = req.body
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a friendly AI financial advisor for NeoBank. Give concise, practical advice in 2-3 sentences max.' },
          { role: 'user', content: `Context: ${context}\n\nQuestion: ${message}` }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    })
    const data = await groqRes.json()
    res.json({ reply: data.choices[0].message.content })
  } catch(e) {
    res.status(500).json({ reply: 'AI advisor unavailable right now.' })
  }
})

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ── CONNECT TO MONGODB + START SERVER ───────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas')
    app.listen(PORT, () => {
      console.log(`
  🏦 NeoBank Server Running!
  ━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server:    http://localhost:${PORT}
  API Auth:  http://localhost:${PORT}/api/auth
  API Trans: http://localhost:${PORT}/api/transactions
  ━━━━━━━━━━━━━━━━━━━━━━━━━━
  Press Ctrl+C to stop
      `)
    })
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message)
    process.exit(1)
  })