# Maintenance Dashboard - Truda Foods

A professional maintenance cost tracking dashboard for Truda Foods with dual-mode data support (Mock/MSSQL).

## Architecture

- **Frontend**: React (Vite) + Tailwind CSS + Feather Icons
- **Backend**: Node.js (Express) + Prisma ORM
- **Database**: SQLite (local) + MSSQL Sage 200 (external)
- **UI Style**: Modern Flat Design with Truda Red (#e11d48) accent

## Project Structure

```
maintenance-dashboard/
├── frontend/              # React frontend application
│   ├── src/              # React source code
│   │   └── components/   # Reusable React components
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies
│   └── vite.config.js    # Vite configuration
├── backend/              # Node.js backend API
│   ├── server/           # Express server code
│   │   ├── index.js      # Main server file
│   │   ├── dbManager.js  # MSSQL connection manager
│   │   ├── mockService.js # Mock data generator
│   │   └── authMiddleware.js # Authentication
│   ├── prisma/           # Database schema and migrations
│   ├── package.json      # Backend dependencies
│   └── .env              # Environment variables
└── README.md             # This file
```

## Environment Configuration

The application supports dual data modes via `DATA_SOURCE` environment variable:

- `DATA_SOURCE=MOCK`: Uses generated mock data (for development)
- `DATA_SOURCE=LIVE`: Connects to MSSQL Sage 200 databases

## MSSQL Connections (in order)

1. **PMB** (Pietermaritzburg): 10.0.1.251
2. **PTA** (Pretoria): 10.2.0.12  
3. **QTN** (Queenstown): 10.3.0.14
4. **CPT** (Cape Town): 10.1.0.8

Credentials: See backend/.env file (not committed to git for security)

## Setup Instructions

### 1. Install Dependencies

```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies  
cd ../backend
npm install
```

### 2. Database Setup

```bash
cd backend
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on: http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:5173

## Features

### 🔐 Authentication & Security
- JWT-based authentication
- Role-based access control (Admin/Dept Head)
- Row-level security based on user permissions
- Branch and cost code restrictions

### 📊 Dashboard Components
- **Metric Cards**: Total costs, completed jobs, pending jobs, overdue jobs
- **Data Tables**: Sortable, filterable maintenance records
- **Charts**: Monthly trends, branch distribution, category analysis
- **Real-time Search**: Quick filtering of maintenance records

### 🎨 Modern Flat UI Design
- Clean, industrial aesthetic
- Truda Red accent color (#e11d48)
- Minimal shadows and borders
- High-density data presentation

### 🔗 Data Management
- **Mock Mode**: 50+ realistic maintenance records
- **Live Mode**: Direct MSSQL Sage 200 integration
- Automatic failover between database connections
- Connection pooling for performance

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (Admin only)

### Maintenance Data
- `GET /api/maintenance/records` - Get filtered maintenance records
- `GET /api/maintenance/stats` - Get dashboard statistics

### Administration
- `GET /api/users` - List all users (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `GET /api/branches` - Get branch information

## User Roles & Permissions

### Admin
- Full access to all data
- User management capabilities
- No branch or cost code restrictions

### Department Head
- Restricted to assigned branch(es)
- Limited to specific cost codes
- Can only view approved maintenance data

## Mock Data Features

The mock service generates realistic maintenance data including:
- Work order numbers (WO-{BRANCH}-{YEAR}-{ID})
- Maintenance categories (Electrical, Plumbing, HVAC, etc.)
- Priority levels (Critical, High, Medium, Low)
- Status tracking (Completed, In Progress, Pending, Cancelled)
- Financial data (costs in ZAR)
- Vendor information

## Production Deployment

### Frontend
```bash
cd frontend
npm run build
# Deploy dist/ folder to web server
```

### Backend
```bash
cd backend
npm start
# Run on production server with PM2 or similar
```

## Security Notes

- JWT tokens expire in 24 hours
- Passwords are hashed using bcrypt
- Row-level security enforced at API level
- CORS configured for cross-origin requests
- Environment variables for sensitive data

## Development Notes

- Proper monorepo structure with separate frontend/backend folders
- Hot reload enabled for both frontend and backend
- Prisma Studio available for database management
- Mock data automatically filtered by user permissions

## Troubleshooting

1. **CORS Issues**: Ensure backend is running on port 3001
2. **Database Connection**: Check MSSQL credentials and network access
3. **Permission Errors**: Verify user roles and cost code assignments
4. **Mock Data Not Loading**: Check DATA_SOURCE environment variable

## Support

For technical issues or questions, contact the development team or check the server logs for detailed error information.