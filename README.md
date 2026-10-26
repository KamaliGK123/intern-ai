# InternFlow AI — Intelligent Internship Management Platform

> AI-powered platform to manage 100+ interns with automated task explanations, email notifications, review scheduling, and structured feedback.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Bootstrap 5, React Router v6, FullCalendar |
| Backend | Node.js, Express.js, REST API |
| Database | MongoDB, Mongoose |
| AI | Google Gemini 1.5 Flash |
| Email | Nodemailer + SMTP |
| Auth | JWT, bcrypt, RBAC |
| Automation | n8n Webhooks |

---

## 📁 Project Structure

```
internflow-ai/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/            # Axios API client
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth)
│   │   └── pages/          # Role-specific pages
│   └── .env
└── server/                 # Node.js + Express backend
    ├── src/
    │   ├── config/         # DB connection
    │   ├── controllers/    # Route handlers
    │   ├── middleware/      # Auth, error, validation
    │   ├── models/         # Mongoose models
    │   ├── routes/         # Express routes
    │   └── utils/          # Logger, email, AI service
    └── .env
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API key
- Gmail App Password (for email)
- n8n (optional, for automation)

### 1. Clone & Install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure Environment Variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your credentials

# Client
cp client/.env.example client/.env  # Already set
```

**Required server `.env` values:**

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Min 32-char secret key |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `N8N_WEBHOOK_SECRET` | Shared secret for n8n |

### 3. Seed Database

```bash
cd server
npm run seed
```

This creates:
- Admin: `admin@internflow.com` / `Admin@123456`
- Mentor: `mentor@internflow.com` / `Mentor@123456`  
- Intern: `intern@internflow.com` / `Intern@123456`
- Demo project with 3 modules

### 4. Start Development Servers

```bash
# Terminal 1 — Backend
cd server
npm run dev    # Runs on http://localhost:5000

# Terminal 2 — Frontend
cd client
npm run dev    # Runs on http://localhost:5173
```

---

## 🔑 User Roles & Access

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access — manage users, projects, tasks, meetings |
| **Mentor** | Assign tasks, approve AI explanations, review submissions, create feedback |
| **Intern** | View tasks, submit work, view feedback, chat with AI assistant |

---

## 🤖 AI Features

### Task Explanation (Gemini)
1. Admin/Mentor creates a task with description and requirements
2. Click **"Generate AI Explanation"** on the task detail page
3. Gemini generates a 10-section beginner-friendly explanation
4. Mentor reviews/edits the explanation
5. Click **"Approve & Send Email"** — sends the explanation to the intern

### AI Feedback Structuring
1. Mentor writes raw review notes
2. AI converts notes into structured report: completed ✅ / issues ⚠️ / corrections 🔧 / steps 📚
3. Mentor approves → intern receives email

### AI Chat Assistant (Intern Only)
- Intern asks questions about their tasks
- Gemini answers using their task context
- Cannot access other interns' data

---

## 📧 Email Notifications

| Event | Recipients |
|-------|-----------|
| Task assigned (after AI approval) | Intern |
| Feedback approved | Intern |
| Meeting scheduled | Intern + Mentor |
| Meeting rescheduled | Intern + Mentor |
| Meeting cancelled | Intern + Mentor |
| Deadline 24h/48h reminder | Intern |
| Task overdue | Intern |

**Gmail Setup:**
1. Enable 2FA on Gmail
2. Go to Google Account → Security → App Passwords
3. Create an App Password for "Mail"
4. Use that password as `SMTP_PASS`

---

## 🔄 n8n Automation Setup

### Install n8n
```bash
npm install -g n8n
n8n start  # Runs on http://localhost:5678
```

### Webhook Endpoints
All webhooks require header: `x-webhook-secret: <N8N_WEBHOOK_SECRET>`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/deadline-reminder` | POST | Send deadline reminders (`body: {hours: 24}`) |
| `/api/webhooks/meeting-reminder` | POST | Send meeting reminders (`body: {hours: 1}`) |
| `/api/webhooks/mark-overdue` | POST | Mark overdue tasks & notify |
| `/api/webhooks/test` | GET | Verify webhook connection |

### Recommended n8n Workflows

**Workflow A — Daily Overdue Check (runs at midnight)**
- Schedule Trigger (0 0 * * *)
- HTTP Request → POST `/api/webhooks/mark-overdue`

**Workflow B — 24h Deadline Reminders (runs hourly)**
- Schedule Trigger (0 * * * *)
- HTTP Request → POST `/api/webhooks/deadline-reminder` with `{hours: 24}`

**Workflow C — 1h Meeting Reminders**
- Schedule Trigger (0 * * * *)
- HTTP Request → POST `/api/webhooks/meeting-reminder` with `{hours: 1}`

---

## 📡 API Documentation

### Authentication
```
POST /api/auth/login        — Login
GET  /api/auth/me           — Get current user
POST /api/auth/logout       — Logout
PUT  /api/auth/change-password
```

### Users (Admin)
```
GET    /api/users            — List all users (paginated)
POST   /api/users            — Create user
PUT    /api/users/:id        — Update user
DELETE /api/users/:id        — Deactivate user
GET    /api/users/mentors    — List active mentors
GET    /api/users/interns    — List active interns
GET    /api/users/:id/stats  — Intern statistics
```

### Tasks
```
GET    /api/tasks            — List tasks (role-filtered)
POST   /api/tasks            — Create task
GET    /api/tasks/:id        — Get task detail
PUT    /api/tasks/:id        — Update task
DELETE /api/tasks/:id        — Delete task
PUT    /api/tasks/:id/status — Update status
POST   /api/tasks/:id/generate-explanation  — Generate AI explanation
PUT    /api/tasks/:id/approve-explanation   — Approve + send email
POST   /api/tasks/:id/submit               — Submit task (intern)
GET    /api/tasks/:id/submissions          — Get submission history
```

### Meetings
```
GET  /api/meetings           — List meetings
POST /api/meetings           — Schedule meeting
PUT  /api/meetings/:id/reschedule
PUT  /api/meetings/:id/cancel
PUT  /api/meetings/:id/complete
```

### Feedback
```
GET  /api/feedback           — List feedback
POST /api/feedback           — Create feedback (AI-structured)
PUT  /api/feedback/:id/approve — Approve + email intern
```

### Dashboard
```
GET /api/dashboard/admin    — Admin stats + intern table
GET /api/dashboard/mentor   — Mentor stats
GET /api/dashboard/intern   — Intern stats + tasks
GET /api/dashboard/notifications
PUT /api/dashboard/notifications/:id/read
PUT /api/dashboard/notifications/read-all
```

### AI
```
POST /api/ai/chat           — Intern AI chat (intern only)
```

---

## 🔐 Security Features

- JWT authentication with 7-day expiry
- bcrypt password hashing (12 rounds)
- Role-based access control on all routes
- Intern data isolation (can't access other interns' data by ID manipulation)
- Rate limiting: 20 auth attempts / 200 API calls per 15 min
- Helmet.js HTTP security headers
- CORS restricted to frontend origin
- Webhook authentication via shared secret
- Input validation on all endpoints
- Soft delete (deactivation instead of hard delete)
- Audit log for all sensitive actions

---

## 🧪 Testing

### Manual API Tests (Postman)

1. Import base URL: `http://localhost:5000`
2. Test auth: `POST /api/auth/login` with admin credentials
3. Copy JWT token from response
4. Add header: `Authorization: Bearer <token>`
5. Test each endpoint

### Frontend Tests
1. Open `http://localhost:5173`
2. Use demo credentials for each role
3. Test complete workflow: create intern → assign task → generate AI explanation → approve → schedule meeting → add feedback → approve feedback

---

## 🚀 Deployment

### Backend (Railway / Render / AWS)
1. Set all environment variables
2. Use `npm start` as the start command
3. Set `NODE_ENV=production`
4. Use MongoDB Atlas for the database

### Frontend (Vercel / Netlify)
1. Set `VITE_API_URL` to your deployed backend URL
2. Run `npm run build`
3. Deploy the `dist/` folder

---

## ⚠️ Known Requirements

| Feature | Status | Notes |
|---------|--------|-------|
| MongoDB | ✅ Required | Local or Atlas |
| JWT Auth | ✅ Working | Configured |
| AI Explanation | ⚙️ Needs key | Set `GEMINI_API_KEY` |
| Email | ⚙️ Needs config | Set SMTP vars |
| n8n Automation | ⚙️ Optional | App works without it |
| AI Chat | ⚙️ Needs key | Same Gemini key |

The application works fully without Gemini and SMTP configured — AI features show a clear error message and email sends are logged but skipped gracefully.
