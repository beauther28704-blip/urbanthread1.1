# UrbanThread 1.1 — Streetwear Marketplace

An exclusive full-stack MERN streetwear marketplace engineered with:
- **Role-Based Access Control (RBAC)**: Customer, Verified Atelier Vendor, and System Administrator.
- **Automated 10% Developer Platform Commission**: The backend calculates a 10% platform fee and 90% vendor payout per order without revealing commission math to the customer.
- **Safaricom M-Pesa STK Push Integration**: Realistic automated phone push authorization simulation.
- **Team Engineering Collective**: Prince Wisdom, Beauther Ndemo, Scarlett Flowerlett, Bianca Akinyi, and Lucy Ruguru.

---

## Folder Structure

```
Urbanthread1.1/
├── package.json               # Backend npm package config
├── .env.example               # Environment variable templates
├── backend/
│   ├── server.js              # Express server connecting to MongoDB Atlas
│   ├── middleware/
│   │   └── authMiddleware.js  # verifyToken, verifyVendor, verifyAdmin
│   ├── models/
│   │   ├── User.js            # User Schema (customer, vendor, admin)
│   │   ├── Product.js         # Streetwear product schema
│   │   └── Order.js           # Order ledger with 10% platform fee & vendor payout
│   └── routes/
│       ├── authRoutes.js      # /api/auth/register, /api/auth/login, /api/auth/me
│       ├── productRoutes.js   # /api/products catalog & vendor drop publishing
│       ├── orderRoutes.js     # /api/orders/checkout & /api/orders telemetry
│       └── userRoutes.js      # /api/users admin governance & account revocation
├── frontend/
│   └── public/
│       ├── index.html         # Dark streetwear storefront & team banner
│       ├── cart.html          # Shopping cart & clean M-Pesa STK push checkout
│       ├── login.html         # Portal login & customer/vendor registration
│       └── admin.html         # Operations dashboard & admin governance table
└── assets/
    └── images/                # Studio product photography assets
```

---

## Quick Start (Local Setup)

1. **Install dependencies**:
   ```bash
   cd Urbanthread1.1
   npm install
   ```

2. **Configure Environment Variables (Optional)**:
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(If `MONGO_URI` is omitted, the app automatically runs in resilient in-memory mode with pre-seeded demo accounts!)*

3. **Start the Express Server**:
   ```bash
   npm start
   ```

4. **Open in Browser**:
   Navigate to `http://localhost:5000` or open any file in `frontend/public/` directly.

---

## Deployment Options

- **Render / Railway / Heroku**: Connect repository, set Root Directory to `Urbanthread1.1`, and set start command to `node backend/server.js`.
- **Vercel / Netlify**: Deploy `frontend/public` as static frontend or connect to backend API URL.
