# Multi-Tenant Task Manager

A full-stack, multi-tenant task management SaaS application built with Next.js (Frontend) and NestJS (Backend), featuring role-based access control, Google OAuth, and real-time activity tracking.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** (running locally or via Docker)

---

## 🚀 How to Run the Project Locally

The project is split into two directories: `frontend` and `backend`. You will need to run both simultaneously in separate terminal windows.

### 1. Database Setup

Ensure your local PostgreSQL instance is running. By default, the application connects to a local database named `taskmanager`. You may need to create this database if it doesn't exist:

```sql
CREATE DATABASE taskmanager;
```

### 2. Backend Setup

Open a new terminal window and navigate to the backend directory:

```bash
cd backend
```

**Install dependencies:**
```bash
npm install
```

**Environment Variables:**
Ensure you have a `.env` file in the `backend` directory. It should contain your database URL, JWT secrets, and Google OAuth credentials.
Example:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/taskmanager?schema=public"
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
```

**Run Database Migrations:**
Initialize your database schema using Prisma:
```bash
npx prisma migrate dev
```

**Start the Backend Server:**
```bash
npm run start:dev
```
The backend server will run on [http://localhost:3001/api/v1](http://localhost:3001/api/v1).

---

### 3. Frontend Setup

Open a second terminal window and navigate to the frontend directory:

```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Environment Variables:**
Create a `.env.local` file in the `frontend` directory (if you have frontend-specific env variables). By default, the app is configured to connect to `http://localhost:3001/api/v1`.
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Start the Frontend Server:**
```bash
npm run dev
```
The frontend web application will run on [http://localhost:3000](http://localhost:3000).

---

## 🔗 Important Localhost Links

### Application Access
- **Frontend App:** [http://localhost:3000](http://localhost:3000)
- **Backend API Base URL:** [http://localhost:3001/api/v1](http://localhost:3001/api/v1)

### Google OAuth Flow
- **Initiate Google Login (Backend endpoint):** [http://localhost:3001/api/v1/auth/google](http://localhost:3001/api/v1/auth/google)
- **Google Callback URL (Registered in Google Cloud Console):** `http://localhost:3001/api/v1/auth/google/callback`
- **Frontend Login Page:** [http://localhost:3000/login](http://localhost:3000/login) (Click the "Continue with Google" button here to start the flow smoothly)
