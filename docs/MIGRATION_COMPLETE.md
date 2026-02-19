# Migration Complete: Supabase → MongoDB

## ✅ What Was Done

### Backend Changes
1. **Replaced Sequelize with Mongoose**
   - New MongoDB connection config (`backend/src/config/database.js`)
   - Mongoose models: `User`, `Resume`, `Company`, `Keyword`
   - Removed old Sequelize model files

2. **Added Member Authentication**
   - `POST /auth/register` - Member registration with access code
   - `POST /auth/member/login` - Member login
   - `POST /auth/login` - Unified endpoint (handles both admin and member)
   - `GET /auth/me` - Get current user (works for both admin and members)

3. **Updated Controllers**
   - `resumeController.js` - Fully migrated to Mongoose
   - `authController.js` - Added member auth functions
   - `authRoutes.js` - Added member routes

4. **Updated Middleware**
   - `authenticate` - Now works for both admin and member tokens
   - `authenticateAdmin` - Admin-only middleware
   - `isAdmin` - Admin role check

### Frontend Changes
1. **Removed Supabase**
   - Created `MemberAuthContext.js` (replaces `SupabaseAuthContext.js`)
   - Updated all components to use new auth context
   - Removed Supabase references from middleware

2. **Updated Components**
   - `layout.js` - Uses `MemberAuthProvider`
   - `Header.js` - Uses `useMemberAuth`
   - `ProtectedRoute.js` - Uses `useMemberAuth`
   - `member-login/page.js` - Updated for backend auth
   - `member-register/page.js` - Added firstName/lastName fields

3. **Updated API**
   - `api.js` - Added `memberLogin` method, fixed interceptor

## 📋 Next Steps

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install mongoose
npm uninstall sequelize pg pg-hstore
```

**Frontend:**
```bash
cd /home/ivoleti18/Clubs/resume_app  # project root
npm uninstall @supabase/auth-helpers-nextjs @supabase/ssr @supabase/supabase-js
```

### 2. Environment Variables

**Backend `.env`:**
```env
# Add MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/resume_db
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/resume_db

# Keep existing vars:
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
```

**Frontend `.env.local`:**
```env
# Remove these Supabase vars:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Keep:
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api
```

### 3. Delete Old Files (Optional Cleanup)

These files are no longer needed:
- `src/lib/supabaseClient.js`
- `src/lib/SupabaseAuthContext.js`

You can delete them:
```bash
rm src/lib/supabaseClient.js
rm src/lib/SupabaseAuthContext.js
```

### 4. Test the Migration

1. **Start MongoDB** (if using local):
   ```bash
   # If using Docker:
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or use MongoDB Atlas (cloud)
   ```

2. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend:**
   ```bash
   npm run dev
   ```

4. **Test Member Registration:**
   - Go to `/auth/member-register`
   - Register with access code: `EpsilonSigma`
   - Should create user in MongoDB

5. **Test Member Login:**
   - Go to `/auth/member-login`
   - Login with registered credentials
   - Should receive JWT token

6. **Test Resume Search:**
   - Should work for authenticated members
   - Protected routes should redirect if not authenticated

### 5. Data Migration (If You Have Existing Postgres Data)

If you have existing resumes in PostgreSQL that you want to migrate:

1. Export data from PostgreSQL (CSV or JSON)
2. Create a migration script that:
   - Reads exported data
   - Converts integer IDs to MongoDB ObjectIds
   - Maps relationships (companies/keywords) to ObjectId arrays
   - Inserts into MongoDB using Mongoose models

Example migration script structure:
```javascript
// backend/src/scripts/migrateFromPostgres.js
const connectDB = require('../config/database');
const { Resume, Company, Keyword } = require('../models');
// ... read Postgres data and insert into MongoDB
```

## 🔍 Key Differences

| Feature | Before (Supabase) | After (MongoDB) |
|---------|------------------|-----------------|
| **Member Auth** | Supabase Auth (frontend) | Backend JWT (same as admin) |
| **Database** | PostgreSQL + Sequelize | MongoDB + Mongoose |
| **User Storage** | Supabase (external) | MongoDB User collection |
| **Token Storage** | Supabase session | localStorage JWT token |
| **Auth Context** | `SupabaseAuthContext` | `MemberAuthContext` |

## 🐛 Troubleshooting

**"MongoDB connection error"**
- Check `MONGODB_URI` in backend `.env`
- Ensure MongoDB is running (local) or Atlas cluster is accessible

**"Cannot find module 'mongoose'"**
- Run `npm install mongoose` in backend directory

**"401 Unauthorized" on member routes**
- Check that token is being sent in `Authorization: Bearer <token>` header
- Verify JWT_SECRET matches between token generation and verification

**"User already exists" on registration**
- MongoDB enforces unique email constraint
- Check existing users: `db.users.find({ email: "..." })`

## 📚 Documentation

- Migration guide: `docs/MIGRATION_SUPABASE_TO_MONGODB.md`
- MongoDB models: `backend/src/models/`
- Auth routes: `backend/src/routes/authRoutes.js`
- Frontend auth: `src/lib/MemberAuthContext.js`
