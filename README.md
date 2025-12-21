# Task Management System

> A modern, full-stack task management application with Kanban board, time tracking, and real-time updates.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Development](#-development)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Core Functionality
- ✅ **Kanban Board** - Drag & drop tasks between columns (To Do, In Progress, Done)
- ✅ **Time Tracking** - Start/pause/resume/stop timer with automatic time logging
- ✅ **Task Management** - Create, edit, delete tasks with rich metadata
- ✅ **Filtering & Search** - Filter by project, status, and search by title/description
- ✅ **Persistence** - All data saved to PostgreSQL with optimistic updates

### User Experience
- ✅ **Loading States** - Skeleton loaders for better perceived performance
- ✅ **Empty States** - Helpful messages when no data is available
- ✅ **Responsive Design** - Works on desktop and mobile devices
- ✅ **Real-time Updates** - Optimistic UI updates with error rollback

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Drag & Drop:** @dnd-kit
- **State Management:** Zustand

### Backend
- **Framework:** Hono
- **Runtime:** Bun
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM

### Monorepo
- **Build System:** Turborepo
- **Package Manager:** Bun

---

## 📦 Prerequisites

- **Bun** >= 1.0.0
- **PostgreSQL** >= 14
- **Node.js** >= 18 (for compatibility)

---

## 🚀 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd task-management
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Setup PostgreSQL Database
```bash
# Create database
createdb task_management

# Or using psql
psql postgres
CREATE DATABASE task_management;
\q
```

### 4. Configure Environment Variables

**Backend (`apps/api/.env`):**
```bash
DATABASE_URL="postgresql://localhost:5432/task_management"
PORT=3001
```

**Frontend (`apps/web/.env.local`):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Run Database Migrations
```bash
cd packages/db
bun run db:generate
bun run db:migrate
cd ../..
```

---

## 💻 Development

### Start All Services
```bash
bun run dev
```

This starts:
- **Frontend:** http://localhost:3002
- **Backend API:** http://localhost:3001

### Start Services Individually
```bash
# Terminal 1 - Backend
cd apps/api
bun run dev

# Terminal 2 - Frontend
cd apps/web
bun run dev
```

---

## 📁 Project Structure

```
task-management/
├── apps/
│   ├── api/                    # Hono backend
│   │   └── src/routes/        # API routes
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── components/    # React components
│           ├── hooks/         # Custom hooks
│           ├── stores/        # Zustand stores
│           └── types/         # TypeScript types
├── packages/
│   └── db/                     # Database package
│       └── src/schema/        # Drizzle schemas
└── README.md
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Time Logs
- `GET /api/time-logs` - List time logs
- `POST /api/time-logs` - Create time log
- `DELETE /api/time-logs/:id` - Delete time log

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL
pg_isready

# Restart PostgreSQL
brew services restart postgresql  # macOS
```

### Port Already in Use
```bash
# Find process
lsof -i :3001

# Kill process
kill -9 <PID>
```

---

## 📝 Scripts

```bash
# Development
bun run dev          # Start all services

# Database
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio

# Build
bun run build        # Build all packages
```

---

**Built with ❤️ using modern web technologies**
