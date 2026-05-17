// ============================================
// routes/transactions.js
// Handles all money-related operations
// POST /api/transactions/send
// GET  /api/transactions
// GET  /api/transactions/stats
// All routes are protected (require login)
// ============================================

import express from 'express'
import Transaction from '../models/Transaction.js'
import User from '../models/User.js'
import protect from '../middleware/auth.js'


const router = express.Router()

// All routes here require login
// Instead of adding protect to each route
// we use router.use() to apply it to ALL routes

// ══════════════════════════════════════════
// ROUTE 1: SEND MONEY
// POST /api/transactions/send
// ══════════════════════════════════════════
router.post('/send', protect , async (req, res) => {

  // Get data from request body
  const { receiverEmail, amount, description, category } = req.body

  // Validate inputs
  if (!receiverEmail || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Please provide receiver email and amount'
    })
  }

  // Amount must be positive
  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be greater than 0'
    })
  }

  try {

    // STEP 1: Find the sender (current logged in user)
    // req.user was attached by protect middleware
    const sender = await User.findById(req.user._id)

    // STEP 2: Check sender has enough balance
    if (sender.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      })
    }

    // STEP 3: Find the receiver by email
    const receiver = await User.findOne({ email: receiverEmail })

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found — check the email address'
      })
    }

    // STEP 4: Cannot send money to yourself
    if (sender._id.toString() === receiver._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send money to yourself'
      })
    }

    // STEP 5: Create the transaction record
    const transaction = await Transaction.create({
      sender:      sender._id,
      receiver:    receiver._id,
      amount:      parseFloat(amount),
      description: description || 'Transfer',
      category:    category || 'other',
      status:      'completed'
    })

    // STEP 6: Update balances
    // Subtract from sender
    sender.balance = sender.balance - parseFloat(amount)
    await sender.save()

    // Add to receiver
    receiver.balance = receiver.balance + parseFloat(amount)
    await receiver.save()

    // STEP 7: Return success response
    res.status(201).json({
      success: true,
      message: `€${amount} sent to ${receiver.name} successfully!`,
      transaction: {
        id:          transaction._id,
        amount:      transaction.amount,
        receiver:    receiver.name,
        description: transaction.description,
        status:      transaction.status,
        createdAt:   transaction.createdAt
      },
      newBalance: sender.balance
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ══════════════════════════════════════════
// ROUTE 2: GET TRANSACTION HISTORY
// GET /api/transactions
// ══════════════════════════════════════════
router.get('/', protect , async (req, res) => {

  try {

    // Find all transactions where
    // current user is EITHER sender OR receiver
    const transactions = await Transaction.find({
      $or: [
        { sender:   req.user._id },
        { receiver: req.user._id }
      ]
    })
    // $or is a MongoDB operator
    // means: match if sender=me OR receiver=me

    // .populate() replaces the ObjectId references
    // with actual user data from the User collection
    // Instead of: sender: "6641f2b3..."
    // We get:     sender: { name: "Keshav", email: "..." }
    .populate('sender',   'name email accountNumber')
    .populate('receiver', 'name email accountNumber')

    // Sort by newest first
    // -1 = descending (newest first)
    // 1  = ascending  (oldest first)
    .sort({ createdAt: -1 })

    // Only return last 50 transactions
    .limit(50)

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ══════════════════════════════════════════
// ROUTE 3: GET SPENDING STATS
// GET /api/transactions/stats
// Used for the analytics chart on dashboard
// ══════════════════════════════════════════
router.get('/stats', protect , async (req, res) => {

  try {

    // Find only transactions where user is SENDER
    // (money they spent, not received)
    const sentTransactions = await Transaction.find({
      sender: req.user._id,
      status: 'completed'
    })

    // Calculate total spent per category
    // reduce() loops through array and builds an object
    const categoryStats = sentTransactions.reduce((acc, transaction) => {
      const category = transaction.category

      // If category not in acc yet, add it with 0
      if (!acc[category]) {
        acc[category] = 0
      }

      // Add this transaction's amount to the category
      acc[category] += transaction.amount

      return acc
    }, {})
    // {} is the starting value of acc (empty object)

    // Calculate total spent (all categories)
    const totalSpent = sentTransactions.reduce((sum, t) => {
      return sum + t.amount
    }, 0)

    // Get transactions from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentTransactions = sentTransactions.filter(t => {
      return t.createdAt >= thirtyDaysAgo
    })

    const recentSpent = recentTransactions.reduce((sum, t) => {
      return sum + t.amount
    }, 0)

    res.status(200).json({
      success: true,
      stats: {
        totalSpent,
        recentSpent,
        categoryStats,
        transactionCount: sentTransactions.length
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

export default router