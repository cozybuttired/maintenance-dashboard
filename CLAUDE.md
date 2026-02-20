# Maintenance Dashboard Project

## Project Overview
Full-stack maintenance tracking application with React frontend and Node.js backend.

**Tech Stack:**
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: Prisma ORM
- Auth: JWT middleware

**Project Structure:**
```
maintenance-dashboard/
├── frontend/          # React app
│   ├── src/          # Components, pages, services
│   └── vite.config.js
├── backend/          # Node.js API
│   ├── server/       # Routes, middleware, DB manager
│   └── .env          # Environment variables
└── prisma/           # Database schema
```

## Development Commands
```bash
npm run dev          # Run both frontend + backend concurrently
npm run build        # Build frontend for production
npx prisma generate  # Regenerate Prisma client after schema changes
```

## Code Standards

### General Rules
- Keep functions small and focused
- Use meaningful variable names
- No console.logs in production code
- Handle errors at API boundaries only

### React Conventions
- Functional components with hooks
- Use existing component patterns (check src/ before creating new ones)
- Keep components under 200 lines

### Backend Conventions
- Use existing middleware patterns (see authMiddleware.js)
- Database operations via Prisma only
- Validate input at route level

### Security
- Never commit .env files
- All API routes require auth unless explicitly public
- Sanitize user input to prevent SQL injection/XSS

## Testing Instructions
After changes:
1. Run dev server to verify no runtime errors
2. Test affected features manually
3. Check browser console for errors

## Workflow: Fix → Test → Push → Pull → Restart

**Chad's preferred workflow for this production project:**
When you fix a bug or implement a feature, follow this sequence:
1. **Fix** the code locally
2. **Verify** the fix works (review code, check for errors)
3. **Commit & Push** to git (create a meaningful commit message)
4. **Pull** changes on production server (10.0.60.57)
5. **Rebuild & Restart** Docker containers:
   - `docker compose build --no-cache [service]`
   - `docker compose up -d [service]`
6. **Verify** container is healthy before closing

This keeps production in sync immediately after fixes. (Note: Other projects may spend more time in dev before this workflow applies.)

## Production Setup

- **Server:** 10.0.60.57
- **Frontend URL:** http://10.0.60.57:5173
- **Backend API:** http://10.0.60.57:3001/api
- **Source Location:** /home/chadupton/C:maintenance-dashboard
- **Database:** MySQL (external mysql-server network)

## Quick Commands

```bash
# SSH to production server
ssh chadupton@10.0.60.57

# Rebuild and restart backend
docker compose build --no-cache backend && docker compose up -d backend

# Rebuild and restart frontend
docker compose build --no-cache frontend && docker compose up -d frontend

# View container logs (follow mode)
docker logs maintenance-dashboard-backend -f

# Check all container status
docker compose ps
```

## Known Issues & Workarounds

- **Infrastructure:** PTA (10.2.0.12), QTN (10.3.0.14), CPT (10.1.0.8) servers experience intermittent connection timeouts
- **Reliable Branch:** Only PMB (10.0.1.251) connects reliably
- **Workaround:** Backend returns partial data from PMB when other branches fail
- **Data Polling:** 45-second polling refreshes maintenance data on dashboard only (paused on other tabs)

## Critical Technical Notes

- **Prisma Version:** Uses 5.x (NOT 7.x - the better-sqlite3 adapter has bugs)
- **Authentication:** JWT tokens stored in localStorage
- **Data Refresh:** 45-second polling updates dashboard (paused when not viewing dashboard tab)
- **Database:** Prisma ORM with MySQL backend
- **Docker:** Multi-stage build with production optimization

## Compaction Instructions
When compacting conversation history, preserve:
- Recent code changes and their locations
- Open bugs or errors encountered
- User decisions about implementation approach

Remove:
- Verbose command outputs (keep only errors)
- Successful file operations
- Repeated exploration of same files
- Completed tasks

## Notes
- Database migrations require manual review before running
- Frontend proxy configured to backend (check vite.config.js)
- Auth tokens stored in localStorage (frontend)
