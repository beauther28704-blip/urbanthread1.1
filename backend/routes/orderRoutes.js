/**
 * @file backend/routes/orderRoutes.js
 * @description Order management, automated 10% commission calculations, and M-Pesa STK push simulation
 */
const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin, verifyVendor } = require('../middleware/authMiddleware');
const Order = require('../models/Order');

// In-memory fallback ledger store if MongoDB is not connected
const fallbackOrders = [];

/**
 * Generate a realistic Kenyan M-Pesa Transaction Receipt
 * Format: e.g. "QK84XZ7912"
 */
function generateMpesaReceipt() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'QK';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/orders/checkout
 * Allows logged-in customers (using verifyToken) to place orders.
 * Automatically and silently computes a 10% platform developer commission in the backend
 * (e.g., 90% vendor payout, 10% platform fee) while keeping this internal breakdown
 * hidden from the customer's checkout response.
 */
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { items, mpesaPhoneNumber, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Please add items before checking out.',
      });
    }

    if (!mpesaPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Valid Safaricom M-Pesa phone number is required for STK push.',
      });
    }

    // 1. Calculate Gross Total from item prices and quantities
    let totalAmount = 0;
    const sanitizedItems = items.map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      totalAmount += price * quantity;
      return {
        productId: String(item.id || item.productId || item._id),
        title: item.title || 'Streetwear Item',
        price,
        quantity,
        vendorId: item.vendorId || 'vendor_default',
        vendorName: item.vendorName || 'UrbanThread Syndicate',
      };
    });

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order total amount.',
      });
    }

    // 2. AUTOMATED BACKEND COMMISSION ENGINE:
    // Compute 10% platform developer commission, 90% vendor payout
    const COMMISSION_RATE = 0.10;
    const platformCommissionAmount = Math.round(totalAmount * COMMISSION_RATE);
    const vendorPayout = totalAmount - platformCommissionAmount;

    // 3. Simulate M-Pesa STK Push execution
    const mpesaReceiptNumber = generateMpesaReceipt();
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 899999 + 100000)}`;
    const orderNumber = `UT-${Date.now().toString().slice(-6)}`;

    const orderData = {
      orderNumber,
      customer: {
        userId: req.user.id,
        name: req.user.name || 'UrbanThread Client',
        email: req.user.email,
        phone: mpesaPhoneNumber,
      },
      items: sanitizedItems,
      totalAmount,
      platformCommission: {
        rate: COMMISSION_RATE,
        amount: platformCommissionAmount,
      },
      vendorPayout,
      paymentDetails: {
        method: 'M-PESA',
        mpesaPhoneNumber,
        mpesaReceiptNumber,
        checkoutRequestId,
        status: 'Completed',
      },
      shippingAddress: shippingAddress || {
        street: 'Kimathi Street, Urban Hub',
        city: 'Nairobi',
        county: 'Nairobi CBD',
      },
      createdAt: new Date(),
    };

    // Save to MongoDB if available, otherwise save to fallback in-memory store
    let savedOrder;
    try {
      savedOrder = await Order.create(orderData);
    } catch (dbErr) {
      savedOrder = { ...orderData, _id: `ord_${Date.now()}` };
      fallbackOrders.unshift(savedOrder);
    }

    // 4. Return clean checkout response to the customer.
    // NOTE: The 10% platform fee and vendor payout are strictly excluded
    // to preserve commercial confidentiality in the customer UI!
    return res.status(201).json({
      success: true,
      message: 'M-Pesa STK push completed successfully. Payment confirmed.',
      order: {
        orderNumber: savedOrder.orderNumber,
        orderId: savedOrder._id,
        totalAmount: savedOrder.totalAmount, // Clean KES figure
        currency: 'KES',
        itemsCount: savedOrder.items.length,
        status: 'Completed',
        paymentDetails: {
          method: 'M-PESA',
          mpesaPhoneNumber: savedOrder.paymentDetails.mpesaPhoneNumber,
          mpesaReceiptNumber: savedOrder.paymentDetails.mpesaReceiptNumber,
          timestamp: new Date().toISOString(),
        },
        shippingAddress: savedOrder.shippingAddress,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server failed to process M-Pesa STK push checkout.',
      error: error.message,
    });
  }
});

/**
 * GET /api/orders
 * Retrieves all orders for platform analytics telemetry.
 * Strictly restricted to System Administrators (verifyAdmin).
 */
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    let orders = [];
    try {
      orders = await Order.find().sort({ createdAt: -1 });
    } catch (err) {
      orders = fallbackOrders;
    }

    // If both MongoDB empty and fallback empty, seed 3 demo telemetry records
    if (!orders || orders.length === 0) {
      const demoOrders = [
        {
          _id: 'ord_demo_101',
          orderNumber: 'UT-849102',
          customer: {
            userId: 'cust_01',
            name: 'Kofi Mensah',
            email: 'kofi@urbanthread.co',
            phone: '254712345678',
          },
          items: [
            {
              productId: 'p1',
              title: 'Distressed Oversized Acid Hoodie',
              price: 8500,
              quantity: 1,
              vendorName: 'Tokyo Void Studio',
            },
          ],
          totalAmount: 8500,
          platformCommission: { rate: 0.10, amount: 850 },
          vendorPayout: 7650,
          paymentDetails: {
            method: 'M-PESA',
            mpesaPhoneNumber: '254712345678',
            mpesaReceiptNumber: 'QK84XZ9102',
            status: 'Completed',
          },
          createdAt: new Date(Date.now() - 3600000 * 4),
        },
        {
          _id: 'ord_demo_102',
          orderNumber: 'UT-849103',
          customer: {
            userId: 'cust_02',
            name: 'Amina Zainab',
            email: 'amina@urbanthread.co',
            phone: '254722998877',
          },
          items: [
            {
              productId: 'p2',
              title: 'Tactical Matte Cargo Trousers',
              price: 11200,
              quantity: 1,
              vendorName: 'Nairobi Cyber Apparel',
            },
          ],
          totalAmount: 11200,
          platformCommission: { rate: 0.10, amount: 1120 },
          vendorPayout: 10080,
          paymentDetails: {
            method: 'M-PESA',
            mpesaPhoneNumber: '254722998877',
            mpesaReceiptNumber: 'QK91PL4431',
            status: 'Completed',
          },
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
      ];
      orders = demoOrders;
    }

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch platform orders.',
      error: error.message,
    });
  }
});

/**
 * GET /api/orders/telemetry
 * Aggregated Gross GMV, 10% Developer Platform Fee, and vendor metrics.
 * Accessible to Admins and Vendors (vendors see aggregate marketplace stats).
 */
router.get('/telemetry', verifyToken, verifyVendor, async (req, res) => {
  try {
    let orders = [];
    try {
      orders = await Order.find();
    } catch (e) {
      orders = fallbackOrders;
    }

    const totalOrdersCount = orders.length || 2;
    const grossGMV = orders.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0) || 19700;
    const totalDeveloperCommission = orders.reduce((acc, curr) => {
      const comm = curr.platformCommission?.amount ?? Math.round((Number(curr.totalAmount) || 0) * 0.10);
      return acc + comm;
    }, 0) || 1970;
    const totalVendorPayout = grossGMV - totalDeveloperCommission;

    return res.json({
      success: true,
      telemetry: {
        grossGMV,
        totalDeveloperCommission,
        commissionRatePercent: 10,
        totalVendorPayout,
        completedOrdersCount: totalOrdersCount,
        currency: 'KES',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate platform telemetry.',
    });
  }
});

module.exports = router;
