/**
 * @file backend/models/Order.js
 * @description Mongoose Schema for UrbanThread Orders with internal automated commission ledger
 */
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  vendorId: {
    type: String,
    default: '',
  },
  vendorName: {
    type: String,
    default: 'UrbanThread Syndicate',
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Internal Automated Developer Commission Ledger (Hidden from customer)
    platformCommission: {
      rate: {
        type: Number,
        default: 0.10, // 10% Platform Developer Fee
      },
      amount: {
        type: Number,
        required: true,
      },
    },
    vendorPayout: {
      type: Number,
      required: true,
    },
    paymentDetails: {
      method: {
        type: String,
        default: 'M-PESA',
      },
      mpesaPhoneNumber: {
        type: String,
        required: true,
      },
      mpesaReceiptNumber: {
        type: String,
        required: true,
      },
      checkoutRequestId: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Completed',
      },
    },
    shippingAddress: {
      street: { type: String, default: 'Streetwear Drop Point' },
      city: { type: String, default: 'Nairobi' },
      county: { type: String, default: 'Nairobi' },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
