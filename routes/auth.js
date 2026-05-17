import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()

const createToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )
}

// SIGNUP
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email and password'
    })
  }

  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      })
    }

    const user = await User.create({ name, email, password })
    const token = createToken(user._id)

    res.status(201).json({
      success: true,
      token,
      user: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        balance:       user.balance,
        accountNumber: user.accountNumber,
        avatarColor:   user.avatarColor
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    })
  }

  try {
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const token = createToken(user._id)

    res.status(200).json({
      success: true,
      token,
      user: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        balance:       user.balance,
        accountNumber: user.accountNumber,
        avatarColor:   user.avatarColor
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET CURRENT USER
router.get('/me', async (req, res) => {
  try {
    let token
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    res.status(200).json({
      success: true,
      user: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        balance:       user.balance,
        accountNumber: user.accountNumber,
        avatarColor:   user.avatarColor,
        createdAt:     user.createdAt
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router