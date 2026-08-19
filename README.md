# EZFinanz - Personal Loan Application Solution

A modern, full-stack personal loan application and management platform with automated credit eligibility, EMI & IRR calculation, KYC onboarding, document verification, live selfie capture, and an administrative review portal.

## 🏗 Architecture & Stack

This project is structured as an npm workspaces monorepo:

```
ezfinanz-loan-platform/
├── backend/            # Express.js + TypeScript + PostgreSQL + Prisma ORM
│   ├── prisma/         # Prisma schema and database migrations
│   ├── src/
│   │   ├── config/     # Environment and app configuration
│   │   ├── controllers/# API route controllers
│   │   ├── lib/        # Shared singletons (Prisma client, logger)
│   │   ├── middlewares/# Error handling, auth, validation middlewares
│   │   ├── routes/     # Express route definitions
│   │   ├── services/   # Business logic and calculation engines
│   │   ├── app.ts      # Express application setup
│   │   └── server.ts   # Server bootstrap & entry point
│   └── package.json
├── frontend/           # Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
│   ├── src/
│   │   ├── app/        # App Router pages and layouts
│   │   ├── components/ # UI components and shadcn/ui primitives
│   │   ├── lib/        # Frontend utilities and API clients
│   │   └── hooks/      # Custom React hooks
│   └── package.json
├── .editorconfig       # Code formatting standards across IDEs
├── .gitignore          # Root Git ignore rules
├── .prettierrc         # Shared Prettier configuration
└── package.json        # Monorepo root workspace configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- PostgreSQL (local instance or Docker container)

### 1. Install Dependencies

Install all workspace dependencies from the root directory:

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment files for both packages:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate --workspace=backend
```

### 4. Run Development Servers

Run both backend and frontend concurrently:

```bash
npm run dev
```

Or run them individually in separate terminals:

```bash
# Backend (http://localhost:5000)
npm run dev:backend

# Frontend (http://localhost:3000)
npm run dev:frontend
```

## 🧪 Quality & Verification

- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Build**: `npm run build`
