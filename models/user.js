import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  balance: {
    type: Number,
    default: 5000
  },
  accountNumber: {
    type: String,
    unique: true
  },
  avatarColor: {
    type: String,
    default: '#7c3aed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return

  if (!this.accountNumber) {
    this.accountNumber = Math.floor(
      1000000000 + Math.random() * 9000000000
    ).toString()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.model('User', userSchema)
export default User