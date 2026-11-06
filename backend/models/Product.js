/**
 * @file backend/models/Product.js
 * @description Mongoose Schema for UrbanThread Streetwear Products
 */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['clothing', 'shoes', 'accessories'],
      required: true,
      default: 'clothing',
    },
    price: {
      type: Number,
      required: [true, 'Price in KES is required'],
      min: 0,
    },
    stock: {
      type: Number,
      default: 20,
      min: 0,
    },
    image: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    vendorName: {
      type: String,
      default: 'UrbanThread Syndicate',
    },
    tag: {
      type: String,
      default: 'Exclusive Drop',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
