import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  type: {
    type: String,
    enum: ['transfer' , 'deposit' , 'withdrawal'],
    default: 'transfer'
  },
  description: {
    type: String,
    trim: true,
    default: 'transfer'
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'shopping', 'entertainment', 'bills', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['pending' , 'completed' , 'failed'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Transaction = mongoose.model('Transaction' , transactionSchema)

export default Transaction