# EZFinanz - Digital Personal Loan Platform

A production-grade, full-stack digital lending and personal loan management platform featuring automated credit underwriting, financial mathematics engines (EMI & IRR), KYC identity verification, dynamic loan tenure selection, bank account validation, digital declaration capture, webcam live selfie auditing, and an administrative review console.

---

## 🌟 Key Highlights & Capabilities

- **12-Stage Deterministic State Machine**: Enforces strict backend application progression from `SIGNUP_COMPLETED` through `DISBURSED` with server-side validation guards preventing stage skipping.
- **Pure-Function Financial Math Engine**:
  - **Standard EMI Calculation**: $P \times r \times (1 + r)^n / ((1 + r)^n - 1)$ with accurate decimal rounding.
  - **Internal Rate of Return (IRR)**: Numerical solver using the **Newton-Raphson method** with **Bisection fallback** to calculate true annualized borrowing APR accounting for net deductions.
- **Automated Underwriting Engine**: Rule-based credit analysis computing Debt-to-Income (DTI) ratio, CIBIL credit score tiering (300–900), and automated loan sanction limits (`ELIGIBLE`, `PARTIALLY_ELIGIBLE`, `NOT_ELIGIBLE`).
- **Dual-Channel OTP & Authentication**:
  - SHA-256 HMAC cryptographic OTP hashing (plaintext OTP is never stored in DB).
  - Rate limiting, 10-attempt lockout window, 60-second resend cooldown.
  - Multi-provider delivery support: **Resend API**, **SMTP**, **Twilio SMS / Verify**, and local development bypass.
  - Google OAuth 2.0 Passport integration.
- **KYC & Document Uploads**: Identity card verification (PAN, Aadhaar, Passport, Voter ID) with file compression and preview.
- **Live Webcam Selfie Verification**: In-browser camera capture with canvas base64 image conversion for KYC liveness checks.
- **Admin Review Console**: Real-time review table, selfie inspection modal, application approval/rejection with mandatory audit reasoning, and 1-click loan disbursement.

---

## 🏗 Architecture & Tech Stack

```
ezfinanz-loan-platform/
├── backend/                  # Node.js + Express + TypeScript + Prisma ORM
│   ├── prisma/               # Database Schema (schema.prisma), Seed script (seed.ts), Verification (verify.ts)
│   ├── src/
│   │   ├── config/           # Environment config (Zod schema) & Passport.js
│   │   ├── modules/          # Domain modules (auth, verification, kyc, eligibility, loan-terms,
│   │   │                     #                 bank-account, declaration, selfie, admin, health)
│   │   ├── prisma/           # Prisma client singleton & connection manager
│   │   ├── shared/           # Middleware (auth, error, rate-limit, logger, validate), utilities, services
│   │   ├── app.ts            # Express application factory & middleware pipeline
│   │   └── server.ts         # Server bootstrap & graceful shutdown
│   └── package.json
├── frontend/                 # Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/              # App Router routes (/login, /signup, /apply, /admin, /dashboard, /verify)
│   │   ├── components/       # UI primitives (Radix UI slots, Lucide icons, Modal, Loan calculator)
│   │   ├── contexts/         # AuthContext with session hydration & JWT token refresh
│   │   └── lib/              # ApiClient with automatic 401 token rotation, validation schemas
│   ├── vercel.json           # Vercel deployment blueprint
│   └── package.json
├── render.yaml               # Render Cloud web service blueprint
├── README.md                 # Project overview & documentation
├── DEMO.md                   # Live demonstration script & timing guide
├── ARCHITECTURE.md           # System architecture, state machine & database reference
├── INTERVIEW_PREP.md         # Technical interview Q&A handbook
└── package.json              # Monorepo root with concurrent scripts
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `>= 18.x` (Recommended: v20.x or v22.x)
- **npm**: `>= 9.x`
- **PostgreSQL**: PostgreSQL 14+ instance (Local or Cloud like Neon / Supabase)

### 1. Installation
Clone the repository and install all root and workspace dependencies:
```bash
git clone https://github.com/Harika-1509/ezfinanz-loan-platform.git
cd ezfinanz-loan-platform
npm install
```

### 2. Environment Configuration
Create the environment files from the provided templates:

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
DATABASE_URL="postgresql://username:password@localhost:5432/ezfinanz?schema=public"
JWT_SECRET=ezfinanz_development_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Optional Provider Credentials (uses secure local fallback if omitted)
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 3. Database Migration & Seed Data
Generate the Prisma Client and seed realistic demo borrowers and admin accounts:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations & seed demo dataset
npm run prisma:seed --workspace=backend
```

### 4. Run Development Servers
Start both backend API and frontend Next.js application concurrently:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api/v1`
- **API Health Check**: `http://localhost:5000/health`

---

## 👥 Seeded Demo Accounts

| Role | Email | Password | Initial Application Stage | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@ezfinanz.com` | `AdminPassword@123` | N/A | Access to `/admin` dashboard |
| **Customer 1** | `aarav.sharma@example.com` | `Customer@123` | `DISBURSED` | Completed full 12-stage cycle |
| **Customer 2** | `priya.patel@example.com` | `Customer@123` | `REJECTED` | Selfie mismatch rejection demo |
| **Customer 3** | `rajesh.iyer@example.com` | `Customer@123` | `WAITING_ADMIN_REVIEW` | Pending admin approval |
| **Customer 4** | `ananya.verma@example.com` | `Customer@123` | `ELIGIBILITY_CHECKED` | Ready for EMI tenure selection |
| **Customer 5** | `vikram.malhotra@example.com` | `Customer@123` | `KYC_PENDING` | Ready for KYC submission |

---

## 🧪 Testing & Code Quality

```bash
# Run unit & integration test suites
npm run test --workspace=backend

# Run TypeScript type checks
npm run type-check --workspace=backend

# Run linting across all workspaces
npm run lint

# Run end-to-end Playwright tests
npm run test:e2e --workspace=frontend
```

---

## 🔒 Security & Best Practices

- **Zero Plaintext Sensitive Storage**: Passwords hashed with bcrypt (salt rounds = 10); OTPs hashed using SHA-256 HMAC with salt before saving to PostgreSQL.
- **Session Architecture**: Short-lived JWT Access Tokens (15 mins) stored in client memory/Authorization headers, paired with rotating HttpOnly Refresh Tokens (30 days) stored in database.
- **Rate Limiting**: `express-rate-limit` prevents brute-force login and OTP flooding attacks.
- **Defense in Depth**: Strict CORS origin parsing, Helmet HTTP security headers, and Zod runtime payload validation on all entry points.
