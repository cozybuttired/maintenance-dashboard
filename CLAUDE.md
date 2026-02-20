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
