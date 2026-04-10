# Backend API Documentation

A production-ready REST API for the LUMIÈRE skincare e-commerce platform — handling everything from customer auth and shopping to AI-assisted skin recommendations, Stripe payments, and delivery tracking.

---

## ✨ Features

### 🔐 Auth & Users
- Customer registration & login with JWT + bcrypt
- Admin & Product Manager login with role-based access control (RBAC)

### 🛍️ Products & Catalog
- Browse products with filters, pagination, and variant support
- Product images, categories, and ingredient management

### 🛒 Shopping & Orders
- Full cart CRUD with stock validation and subtotal calculation
- Order creation with Stripe Payment Intent integration
- Webhook support for async payment confirmation

### 🧴 Skin Profile & Recommendations
- Skin quiz with transactional answer submission
- Personalized product recommendations based on skin type, concerns & ingredients
- Similar products discovery by ingredient overlap
- Result caching in `Recommendation` table

### 👩‍💼 Admin Dashboard
- Product CRUD, variant stock management
- Order filtering with pagination
- Aggregated analytics: revenue, low stock alerts, top products

### 📦 Shipping & Delivery
- Admin marks order as `shipped` with partner & tracking number
- Customer can track their order in real time
- Delivery partner webhook for status updates (`out_for_delivery` → `delivered`)

### ⭐ Reviews & Ratings
- Verified purchase check before allowing review
- Duplicate review prevention per product
- Real-time `avg_rating` calculation

### 🏠 Address Management
- Full CRUD for delivery addresses
- Smart `is_default` flag logic with atomic transactions

### 📊 Analytics
- Admin dashboard: revenue, order totals, low stock alerts, top 5 products
- Customer dashboard: loyalty points, recent orders, cart summary

---

## 🛠 Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-008CDD?style=flat&logo=stripe&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js 5 |
| Language | TypeScript 6 |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon.tech) |
| Payments | Stripe |
| Auth | JWT + bcrypt |
| Security | Helmet, CORS |

---

## 📁 Project Structure

```
DEPI-s-GP-Backend/
├── prisma/
│   └── schema.prisma           # All Prisma models
├── generated/
│   └── prisma/                 # Auto-generated Prisma client
├── src/
│   ├── app.ts                  # Express app setup (routes, middleware)
│   ├── server.ts               # Entry point (port binding)
│   ├── config/
│   │   ├── prisma.ts           # Prisma client instance
│   │   └── stripe.ts           # Stripe client instance
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── productController.ts
│   │   ├── cartController.ts
│   │   ├── orderController.ts
│   │   ├── paymentController.ts
│   │   ├── profileController.ts
│   │   ├── surveyController.ts
│   │   ├── recommendationController.ts
│   │   ├── adminController.ts
│   │   ├── reviewController.ts
│   │   ├── shippingController.ts
│   │   ├── dashboardController.ts
│   │   └── addressController.ts
│   ├── middleware/
│   │   └── authMiddleware.ts   # JWT verification + role guards
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── productRoutes.ts
│   │   ├── cartRoutes.ts
│   │   ├── orderRoutes.ts
│   │   ├── profileRoutes.ts
│   │   ├── surveyRoutes.ts
│   │   ├── recommendationRoutes.ts
│   │   ├── adminRoutes.ts
│   │   ├── reviewRoutes.ts
│   │   ├── shippingRoutes.ts
│   │   ├── dashboardRoutes.ts
│   │   └── addressRoutes.ts
│   └── services/
│       └── recommendationService.ts
├── .env                        # Environment variables (not committed)
├── .env.example                # Template for env vars
├── package.json
├── tsconfig.json
└── prisma.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A [Neon.tech](https://neon.tech) PostgreSQL database
- A [Stripe](https://stripe.com) account (test mode)

### 1. Clone the repo

```powershell
git clone https://github.com/masy43/DEPI-s-GP-Backend.git
cd "DEPI-s-GP-Backend"
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Set up environment variables

```powershell
Copy-Item .env.example .env
# Then open .env and fill in your values
```

### 4. Push schema to DB and generate client

```powershell
npx prisma db push
npx prisma generate
```

### 5. Run in development

```powershell
npm run dev
```

Server will start at `http://localhost:3000`.

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for signing JWTs (use a long random string) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (starts with `sk_test_` for test mode) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Optional | Stripe webhook signing secret for event verification |
| `PORT` | ⚠️ Optional | Server port (defaults to `3000`) |

### `.env.example`

```env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-super-secret-key-at-least-32-chars"
STRIPE_SECRET_KEY="your-stripe-secret-key-here"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
PORT=3000
```

---

## 📡 API Endpoints Reference

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register new customer | ❌ |
| POST | `/api/auth/admin/register` | Register new admin | ❌ |
| POST | `/api/auth/login` | Customer login → JWT | ❌ |
| GET | `/api/auth/me` | Get logged-in customer info | ✅ Customer |
| POST | `/api/admin/login` | Admin/PM login → JWT | ❌ |

### Products
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/products` | List products with filters & pagination | ❌ |
| GET | `/api/products/:id` | Get single product with variants & images | ❌ |

### Cart
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/cart` | Get customer's cart | ✅ Customer |
| POST | `/api/cart/items` | Add item to cart | ✅ Customer |
| PUT | `/api/cart/items/:cartItemId` | Update cart item quantity | ✅ Customer |
| DELETE | `/api/cart/items/:cartItemId` | Remove item from cart | ✅ Customer |

### Orders
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/orders` | Create order + Stripe Payment Intent | ✅ Customer |
| GET | `/api/orders` | List customer's orders | ✅ Customer |
| GET | `/api/orders/:id` | Get order details | ✅ Customer |
| GET | `/api/orders/:id/tracking` | Track order shipping status | ✅ Customer |
| POST | `/api/payments/confirm` | Webhook confirming Stripe payment | ❌ |

### Skin Profile & Recommendations
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/profile` | Get skin profile | ✅ Customer |
| PUT | `/api/profile/skin` | Update skin profile | ✅ Customer |
| GET | `/api/survey/active` | Get active survey questions | ✅ Customer |
| POST | `/api/survey/submit` | Submit survey answers | ✅ Customer |
| GET | `/api/recommendations/profile` | Get personalized product recommendations | ✅ Customer |
| GET | `/api/recommendations/:productId/similar` | Get similar products by ingredients | ❌ |

### Reviews
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/products/:id/reviews` | Submit a review (verified purchase only) | ✅ Customer |
| GET | `/api/products/:id/reviews` | Get reviews + avg rating | ❌ |
| DELETE | `/api/reviews/:reviewId` | Delete own review | ✅ Customer |

### Addresses
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/addresses` | Get all saved addresses | ✅ Customer |
| POST | `/api/addresses` | Add new address (max 5) | ✅ Customer |
| PUT | `/api/addresses/:id` | Update address | ✅ Customer |
| DELETE | `/api/addresses/:id` | Delete address | ✅ Customer |

### Admin
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/admin/products` | Create product with variants/images | ✅ Admin/PM |
| PUT | `/api/admin/products/:id` | Update product details | ✅ Admin/PM |
| DELETE | `/api/admin/products/:id` | Delete product | ✅ Admin/PM |
| PUT | `/api/admin/variants/:id/stock` | Update variant stock | ✅ Admin/PM |
| GET | `/api/admin/orders` | List orders with filters & pagination | ✅ Admin/PM |
| PUT | `/api/admin/orders/:id/ship` | Mark order as shipped | ✅ Admin/PM |

### Dashboard
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/dashboard/admin` | Revenue, low stock, top products | ✅ Admin/PM |
| GET | `/api/dashboard/customer` | Personal stats, recent orders | ✅ Customer |

### Delivery
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| PUT | `/api/delivery/:shipId/update` | Delivery partner webhook (status update) | ❌ |

### Health
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/health` | DB connectivity check | ❌ |

---

## 🧪 Testing (cURL — Key Flows)

### Register & Login

```powershell
# Register
Invoke-RestMethod -Uri http://localhost:3000/api/auth/register -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"user@test.com","password":"Pass123","first_name":"Jane","last_name":"Doe"}'

# Login (save the token)
$res = Invoke-RestMethod -Uri http://localhost:3000/api/auth/login -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"user@test.com","password":"Pass123"}'
$token = $res.token
$headers = @{ Authorization = "Bearer $token" }
```

### Add to Cart → Place Order

```powershell
# Add to cart (replace variant_id with real value)
Invoke-RestMethod -Uri http://localhost:3000/api/cart/items -Method POST `
  -Headers $headers -ContentType "application/json" `
  -Body '{"variant_id":1,"quantity":2}'

# Create order
$order = Invoke-RestMethod -Uri http://localhost:3000/api/orders `
  -Method POST -Headers $headers
$order | ConvertTo-Json -Depth 5
# Use stripe_client_secret on the frontend to complete payment
```

### Submit a Review

```powershell
# Replace 1 with the product_id of a purchased product
Invoke-RestMethod -Uri http://localhost:3000/api/products/1/reviews -Method POST `
  -Headers $headers -ContentType "application/json" `
  -Body '{"rating":5,"comment":"Absolutely love this serum!"}'
```

### Admin: Ship an Order

```powershell
$adminRes = Invoke-RestMethod -Uri http://localhost:3000/api/admin/login -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@lumiere.com","password":"AdminPass123"}'
$adminHeaders = @{ Authorization = "Bearer $($adminRes.token)" }

Invoke-RestMethod -Uri http://localhost:3000/api/admin/orders/1/ship -Method PUT `
  -Headers $adminHeaders -ContentType "application/json" `
  -Body '{"partner_id":1,"tracking_number":"TRK9876543"}'
```

---

## 🔐 Security Notes

- **JWT**: Tokens expire in `7d`. Signed with `JWT_SECRET` — must be set in production.
- **Passwords**: Hashed with `bcrypt` at 12 salt rounds. Plain passwords are never stored.
- **CORS**: Enabled globally. In production, restrict origins via `cors({ origin: "https://yourdomain.com" })`.
- **Helmet**: Applied globally to set secure HTTP headers.
- **Sensitive data**: `password_hash` is never returned in any API response.
- **Stripe**: Payment Intents are created server-side. The client only receives a `client_secret` to complete payment in the browser — the secret key never leaves the server.
- **Env vars**: Never commit `.env`. Use platform secret managers in production.

---

## 🤝 Contributing

### Branch naming
```
feature/XX-short-description   # e.g. feature/13-wishlist
fix/short-description          # e.g. fix/cart-stock-race
```

### Commit format
```
feat: add wishlist endpoint

- add GET/POST/DELETE for wishlisted products
- link wishlist items to customer account

#13
```

### PR process
1. Create branch from `main`
2. Stage only the files you changed (`git add <file>` — no `git add .`)
3. Commit with the format above
4. Push and open a PR on GitHub
5. After merge: delete the remote branch, then pull `main` locally and delete the local branch


