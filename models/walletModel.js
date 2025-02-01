const mongoose = require('mongoose');
const Schema= mongoose.Schema

const walletSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [
    {
      amount: {
        type: Number,
        required: true
      },
      type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
      },
      description: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

walletSchema.index({createdAt:1})

module.exports = mongoose.model('Wallet', walletSchema);