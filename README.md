# TeleGrowth — Multi-Tenant Telegram Referral & Giveaway SaaS Platform

Enterprise-grade, production-ready SaaS platform enabling community managers, crypto projects, and digital creators to operate customized viral referral drives, multi-channel gates, milestone rewards, and provably-fair giveaways without coding.

---

## 🚀 Key Highlights & Architectural Features

### 1. Advanced Referral Tracking Engine
- **Unique Invite Links:** Utilizes Telegram Bot API `createChatInviteLink` to generate individual, attributable links per user per campaign chat rather than modifying primary links.
- **Event Attribution:** Subscribes to `chat_member` updates, extracts joining user IDs, matches incoming invite links with high-performance MongoDB compound indexes, and assigns referral attribution.
- **Strict Anti-Spoofing Rules:** Does not invent referral attribution when a user joins without an attributable link. Enforces atomic uniqueness (1 eligible referral per user per campaign) and blocks self-referrals.
- **Referral Lifecycle:** Strict state machine: `pending` → `joined` → `verification_pending` → `verified` → `rewarded` → `reversed`.

### 2. Multi-Channel Membership Verification
- Requires joining multiple channels/groups (e.g. Channel A, Channel B, Group C) before rewards unlock.
- Real-time `getChatMember` verification, leave/kick detection, and retention audits. If a user leaves before the retention window expires, referrals and ledger points are automatically reversed.

### 3. Append-Only Reward Ledger
- Immutable ledger (`reward_transactions`): every point credit, digital key issuance, or reversal is stamped with an immutable SHA-256 hash. Historical transactions cannot be modified silently.
- Supports points, digital keys/licenses (with batch inventory upload), e-books/PDFs, discount codes, and bonus giveaway raffle tickets.

### 4. Cryptographic Provably-Fair Giveaways
- Uses cryptographically secure random integers (`crypto.randomInt`) with public random seeds and SHA-256 audit hashes.
- Supports referral-weighted tickets (more verified invites = proportionally higher winning odds), pure random draws, and points-based entries.
- Automated replacement winner selection with auditable disqualification logs.
- Dedicated public verification transparency page: `/public/giveaway/:campaignId`.

### 5. Multi-Tenant Architecture & RBAC
- Complete workspace isolation for every creator.
- Granular Role-Based Access Control:
  - **Platform Super Admin:** Platform-wide oversight, user bans, plan editing, revenue & audit monitoring.
  - **Workspace Owner:** Full billing, custom domain, team management, workspace deletion.
  - **Workspace Admin:** Chat verification, custom bot connections, campaign approval.
  - **Campaign Manager:** Campaign creation, reward adjustments, winner drawing.
  - **Viewer:** Read-only analytics and reports.

### 6. Subscription Billing & Limits
- Pre-configured tiers: **Free**, **Pro**, **Business**, and **Enterprise**.
- Hard backend limits on active campaigns, connected chats, and monthly verified referrals.
- **Telegram Stars (⭐)** integration for in-app micro-billing plus external billing support with idempotent payment processing.

---

## 🗄️ MongoDB Atlas Schema Architecture (26 Collections)

1. `users`: String Telegram IDs, profiles, roles, ban statuses.
2. `workspaces`: Tenant entity, slugs, plan relations, custom settings.
3. `workspace_members`: Team access, RBAC roles.
4. `connected_bots`: Primary SaaS bot + AES-256-GCM encrypted custom BotFather tokens.
5. `telegram_chats`: Connected public/private channels and groups with permission tracking.
6. `campaigns`: Referral, giveaway, and hybrid campaign definitions.
7. `campaign_requirements`: Multi-channel gate rules and retention days.
8. `referral_codes`: Unique alphanumeric referral codes per user.
9. `referral_links`: Generated individual Telegram chat invite links.
10. `referrals`: Referral attributions, risk scores, and lifecycle state.
11. `memberships`: Multi-channel join/leave history and verification states.
12. `rewards`: Configurable milestone prizes.
13. `reward_inventory`: Pre-uploaded license keys, codes, and digital downloads.
14. `reward_transactions`: Immutable append-only ledger.
15. `giveaway_entries`: Ticket calculations based on referral counts.
16. `giveaway_winners`: Drawn winners with crypto seed and audit hash.
17. `subscriptions`: Workspace subscription lifecycle.
18. `subscription_plans`: Quotas, pricing in USD and Telegram Stars.
19. `payments`: Payment records with idempotency hashes.
20. `invoices`: Sequential invoices with billing periods.
21. `usage_counters`: Monthly usage per tenant.
22. `fraud_events`: Anti-fraud risk queue.
23. `audit_logs`: Security and administrative audit trail.
24. `notifications`: In-app and Telegram push alerts.
25. `webhook_events`: Idempotent webhook log.
26. `support_tickets`: Support ticketing with Telegram messaging.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, TypeScript, Express, Telegraf 4, Mongoose, Redis, BullMQ, Socket.IO, Jest.
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Infrastructure:** Docker, Docker Compose, Nginx Reverse Proxy, MongoDB ReplicaSet.

---

## 📦 Getting Started

### Prerequisites
- Node.js v20+
- MongoDB v7+ (with replica set enabled for transactions)
- Redis v7+

### 1. Installation
```bash
# Clone repository
git clone https://github.com/your-org/telegram-referral-saas.git
cd telegram-referral-saas

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Setup
Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```

### 3. Run Automated Tests
```bash
cd backend
npm test
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Background Worker
cd backend
npm run worker

# Terminal 3: Frontend Dashboard
cd frontend
npm run dev
```

Visit dashboard at `http://localhost:3000`.

---

## 🐳 Docker Deployment

To launch the complete multi-container production stack with MongoDB, Redis, Backend, Background Worker, Frontend, and Nginx reverse proxy:

```bash
docker-compose up -d --build
```
Access the application on port `80`.
