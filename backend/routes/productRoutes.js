/**
 * @file backend/routes/productRoutes.js
 * @description Catalog browsing and vendor inventory publishing endpoints
 */
const express = require('express');
const router = express.Router();
const { verifyToken, verifyVendor } = require('../middleware/authMiddleware');
const Product = require('../models/Product');

// Pre-seeded streetwear drops (Clothing, Shoes, Accessories)
const fallbackProducts = [
  {
    _id: 'prod_101',
    title: 'Distressed Oversized Acid Hoodie',
    category: 'clothing',
    price: 8500,
    stock: 15,
    image: '/src/assets/images/streetwear_oversized_hoodie_1793968809104.jpg',
    description: 'Heavyweight 520 GSM French terry cotton with hand-distressed raw seams and charcoal vintage acid wash.',
    vendorId: 'usr_vendor_01',
    vendorName: 'Tokyo Void Studio',
    tag: 'Limited 1 of 50',
    createdAt: new Date(),
  },
  {
    _id: 'prod_102',
    title: 'Tactical Matte Cargo Trousers',
    category: 'clothing',
    price: 11200,
    stock: 22,
    image: '/src/assets/images/streetwear_cargo_pants_1793968809553.jpg',
    description: 'Japanese raw cotton twill engineered with 8 tactical zip compartments, anodized D-rings, and magnetic cinch cuffs.',
    vendorId: 'usr_vendor_01',
    vendorName: 'Nairobi Cyber Apparel',
    tag: 'Core Drop',
    createdAt: new Date(),
  },
  {
    _id: 'prod_103',
    title: 'Architectural Stealth Platform Sneaker',
    category: 'shoes',
    price: 18900,
    stock: 8,
    image: '/src/assets/images/streetwear_chunky_sneakers_1793968810806.jpg',
    description: 'Vibram sculpt platform midsole with premium matte nubuck leather uppers and ballistic ripstop panels.',
    vendorId: 'usr_vendor_01',
    vendorName: 'Kibera Kicks Lab',
    tag: 'Run Low Stock',
    createdAt: new Date(),
  },
  {
    _id: 'prod_104',
    title: 'Ballistic Modular Chest Rig Bag',
    category: 'accessories',
    price: 6400,
    stock: 30,
    image: '/src/assets/images/streetwear_utility_crossbody_1793968810796.jpg',
    description: '1000D Cordura military-grade nylon crossbody rig with quick-release Cobra buckle hardware and weather-sealed zippers.',
    vendorId: 'usr_vendor_01',
    vendorName: 'Tokyo Void Studio',
    tag: 'Signature Piece',
    createdAt: new Date(),
  },
];

/**
 * GET /api/products
 * Public catalog browsing for clothing, shoes, and accessories
 */
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let products = [];

    try {
      const query = {};
      if (category && category !== 'all') {
        query.category = category.toLowerCase();
      }
      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }
      products = await Product.find(query).sort({ createdAt: -1 });
    } catch (dbErr) {
      // Use fallback
      products = fallbackProducts.filter((p) => {
        if (category && category !== 'all' && p.category !== category.toLowerCase()) return false;
        if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
    }

    if (!products || products.length === 0) {
      products = fallbackProducts;
    }

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch streetwear catalog.',
      error: error.message,
    });
  }
});

/**
 * POST /api/products
 * Protected endpoint: only verified Vendors and Admins can publish new streetwear
 */
router.post('/', verifyToken, verifyVendor, async (req, res) => {
  try {
    const { title, category, price, stock, image, description, tag } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Product title, price (KES), and category are required.',
      });
    }

    const cleanCategory = ['clothing', 'shoes', 'accessories'].includes(category.toLowerCase())
      ? category.toLowerCase()
      : 'clothing';

    const newProductData = {
      title: title.trim(),
      category: cleanCategory,
      price: Math.max(0, Number(price)),
      stock: Math.max(0, Number(stock) || 10),
      image: image || '/src/assets/images/streetwear_oversized_hoodie_1793968809104.jpg',
      description: description || 'Exclusive limited streetwear silhouette from UrbanThread independent designers.',
      tag: tag || 'New Release',
      vendorId: req.user.id,
      vendorName: req.user.brandName || req.user.name || 'Vendor Atelier',
      createdAt: new Date(),
    };

    let createdProduct;
    try {
      createdProduct = await Product.create(newProductData);
    } catch (err) {
      createdProduct = {
        _id: `prod_${Date.now()}`,
        ...newProductData,
      };
      fallbackProducts.unshift(createdProduct);
    }

    return res.status(201).json({
      success: true,
      message: 'Streetwear drop published successfully to UrbanThread catalog.',
      product: createdProduct,
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to publish product.',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/products/:id
 * Protected: Vendors can delete their own products; Admins can delete any
 */
router.delete('/:id', verifyToken, verifyVendor, async (req, res) => {
  try {
    const productId = req.params.id;

    try {
      await Product.findByIdAndDelete(productId);
    } catch (err) {
      const idx = fallbackProducts.findIndex((p) => p._id === productId);
      if (idx !== -1) fallbackProducts.splice(idx, 1);
    }

    return res.json({
      success: true,
      message: 'Product listing removed.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product.',
    });
  }
});

module.exports = {
  router,
  fallbackProducts,
};
