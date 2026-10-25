# QueueLess — Multi-Tenant Virtual Queue & Customer Flow Management Platform

QueueLess is a modern, high-concurrency virtual queue management system built for retail stores, service centers, clinics, and event venues. It enables businesses to eliminate physical waiting lines by generating QR code digital queues, offering real-time position tracking for customers on mobile devices, and empowering staff with streamlined desk queue controls.

---

## Key Features

- **Multi-Tenant Business Architecture**: Complete data isolation across tenants using Prisma ORM & Supabase PostgreSQL Row-Level Security (RLS).
- **QR Code & Public Join Flow**: Instant QR code generation (Base64 PNG) for every queue. Customers join queues via mobile browser without app downloads.
- **Atomic Position Assignment & Race Protection**: Serialized position numbers via SQL row locking (`FOR UPDATE`) preventing double-assignment under heavy concurrent joins.
- **Live Queue Tracking**: Customer and staff dashboards refresh queue data automatically through the API, with no manual refresh required.
- **SMS & OTP Notifications**: Twilio & Hermes-Relay Android Gateway support for instant SMS alerts (`JOINED`, `YOUR_TURN`, `SERVED`, `CANCELLED`).
- **Staff Queue Management Dashboard**: Staff controls to call the next customer, update service status, and reorder waiting customers.
- **Analytics & Audit Logging**: Store performance metrics (wait times, throughput, peak hours) and immutable platform-wide audit logging.
- **Super Admin Management Portal**: Platform governance interface to manage business subscriptions, suspend/unsuspend accounts, and view platform metrics.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database & ORM**: PostgreSQL & Prisma ORM v7
- **Authentication**: NextAuth.js (Credentials & Google OAuth)
- **Concurrency Control**: PostgreSQL row locks and Prisma transactions
- **Validation**: Zod schema validation
- **Styling**: Tailwind CSS v4 & Lucide React icons
- **Testing**: Jest unit/integration tests & Playwright browser verification

## Concurrent Queue Operations

Queue joins and staff queue actions run inside PostgreSQL transactions that lock the parent queue row. Joins check queue state, business status, working hours, duplicate customers, capacity, and position while holding that lock. Queue settings and status changes use the same lock, so concurrent requests are serialized across Node.js processes and deployment instances.

The database lock is the synchronization primitive here; an in-memory mutex would only coordinate requests handled by one process and would not protect a multi-instance deployment. The concurrency audit script exercises the same transaction path as production queue actions.

---

## Getting Started

### Prerequisites

- Node.js 24 and npm
- PostgreSQL database instance running on port 5432 (or Supabase Postgres instance)

### Setup & Installation

1. **Clone repository and install dependencies**:
   ```bash
   git clone <repository-url>
   cd queueless
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory (see `.env.example`):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/queueless?schema=public"
   DIRECT_URL="postgresql://postgres:postgres@localhost:5432/queueless?schema=public"
   NEXTAUTH_SECRET="your-nextauth-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
   HERMES_RELAY_URL="https://hermes-relay.onrender.com"
   HERMES_RELAY_API_KEY="your-hermes-relay-api-key"
   SMS_ENABLED="true"
   ```

3. **Database Migration & Seeding**:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

- **Unit & Integration Tests**:
  ```bash
  npm test
  ```
- **Linter Check**:
  ```bash
  npm run lint
  ```
- **Production Build Check**:
  ```bash
  npm run build
  ```

---

## Deployment (Vercel)

1. Push your repository to GitHub.
2. Import project into Vercel dashboard.
3. Configure all environment variables in Vercel project settings (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `HERMES_RELAY_URL`, `HERMES_RELAY_API_KEY`, `SMS_ENABLED`).
4. Vercel automatically compiles and deploys production builds cleanly.
