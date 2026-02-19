# Migration: Supabase → MongoDB

This guide explains how your project currently uses Supabase and how to transition to MongoDB.

## Current Architecture

| Layer | Supabase | Backend (Express) |
|-------|----------|-------------------|
| **Member auth** | Yes – sign up, sign in, session (frontend only) | No |
| **Admin auth** | No | Yes – password + JWT |
| **Data (resumes, companies, keywords)** | No | Yes – PostgreSQL + Sequelize |

Supabase is used **only for member authentication** (club members). All app data lives in your Express backend with PostgreSQL and Sequelize. There is no Supabase database in use.

## What “Transition to MongoDB” Involves

1. **Backend database**: Replace PostgreSQL + Sequelize with **MongoDB + Mongoose**.
2. **Member auth**: Move member sign-up/sign-in from Supabase to your **backend** (store members in MongoDB, issue JWT).
3. **Frontend**: Remove Supabase; use the same backend API and JWT for member auth (same pattern as admin).

---

## Step 1: Backend – MongoDB + Mongoose

### 1.1 Install and config

```bash
cd backend
npm install mongoose
npm uninstall sequelize pg pg-hstore
```

Add to `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/resume_db
# Or Atlas: mongodb+srv://user:pass@cluster.mongodb.net/resume_db
```

### 1.2 Mongoose models (replace Sequelize)

- **User** – `_id`, `email`, `password` (hashed), `firstName`, `lastName`, `role` (`admin` | `member`), `isActive`, timestamps.
- **Resume** – `name`, `major`, `graduationYear`, `pdfUrl`, `s3Key`, `uploadedBy`, `isActive`, `companies[]` (ObjectIds), `keywords[]` (ObjectIds).
- **Company** – `name` (unique).
- **Keyword** – `name` (unique).

Many-to-many: store `companyIds` and `keywordIds` arrays on `Resume` (or keep separate junction collections if you prefer).

### 1.3 Replace Sequelize in code

- Swap `backend/src/config/database.js` for a Mongoose connection (e.g. `mongoose.connect(process.env.MONGODB_URI)`).
- Replace `backend/src/models/*` with Mongoose schemas and models.
- Rewrite `resumeController.js` (and any other controllers) to use Mongoose APIs (e.g. `Resume.find()`, `Resume.findById()`, `.populate('companies keywords')`) and drop `sequelize.transaction()` in favor of MongoDB transactions or single-doc updates as needed.
- Remove `backend/src/models/index.js` Sequelize setup; export Mongoose models from a single place instead.

---

## Step 2: Backend – Member Auth (replace Supabase Auth)

### 2.1 Auth routes

Add (or extend) in `backend/src/routes/authRoutes.js`:

- `POST /auth/register` – validate body (e.g. email, password, accessCode), verify access code (e.g. `"EpsilonSigma"`), hash password, create `User` with `role: 'member'`, return JWT.
- `POST /auth/login` – for members: body `{ email, password }`, find user by email, compare password, return JWT and user info. Keep existing `POST /auth/login` for admin (e.g. by checking `password`-only vs `email`+`password` and routing to admin vs member login).

Use the same JWT util you use for admin; include in the payload e.g. `{ id: user._id, email, role }`.

### 2.2 Auth middleware

- **authenticate** – verify JWT, attach `req.user` (id, role). Allow both `admin` and `member`.
- **isAdmin** – after `authenticate`, allow only `req.user.role === 'admin'` (for routes like delete-all).
- **optional: isMember** – allow only `req.user.role === 'member'` where needed.

Protected routes that should work for members (e.g. viewing profile) should use `authenticate` only; admin-only routes should use `authenticate` + `isAdmin`.

### 2.3 Token storage

Members get a JWT from `POST /auth/login` or `POST /auth/register`. Frontend stores it the same way as admin (e.g. `localStorage.setItem('token', data.token)` and send `Authorization: Bearer <token>`). Your existing `api.js` interceptor already attaches `localStorage.getItem('token')` to requests.

---

## Step 3: Frontend – Remove Supabase, Use Backend Auth

### 3.1 Remove Supabase packages

```bash
cd /home/ivoleti18/Clubs/resume_app  # project root (Next.js app)
npm uninstall @supabase/auth-helpers-nextjs @supabase/ssr @supabase/supabase-js
```

### 3.2 Replace Supabase auth with backend auth

- **Delete** (or stop using): `src/lib/supabaseClient.js`, `src/lib/SupabaseAuthContext.js`.
- **New auth context** (e.g. `src/lib/MemberAuthContext.js` or rename to `AuthContext.js`):
  - State: `user`, `isAuthenticated`, `isLoading`.
  - `signIn(email, password)` → `authAPI.login({ email, password })` (or a dedicated `authAPI.memberLogin`), then store `data.token` and optional `data.user` in state/localStorage.
  - `signUp(email, password, accessCode)` → `authAPI.register({ email, password, accessCode })`, then same as above.
  - `signOut()` → clear `token` (and any user state), call backend logout if you add it (optional).
  - On init: if `localStorage.getItem('token')` exists, call `authAPI.getCurrentUser()` to set `user` (backend must support this for members and return 401 if invalid).
- **Backend** must expose:
  - `GET /auth/me` – for both admin and member; decode JWT, return `{ id, email, role }` (and any extra profile fields). This is already there for admin; extend it to accept member JWT and return member profile.

### 3.3 Update UI and middleware

- Replace `useSupabaseAuth` with the new hook (e.g. `useMemberAuth` or `useAuth`) everywhere: `Header.js`, `ProtectedRoute.js`, `auth/member-login/page.js`, `auth/member-register/page.js`, etc.
- In `layout.js`, wrap the app with the new auth provider instead of `SupabaseAuthProvider`.
- **Middleware** (`src/middleware.js`): today it checks `x-supabase-auth` and admin cookie. Change to: for protected routes, either rely on the backend returning 401 and the frontend redirecting (no change in middleware), or have the frontend send the same `Authorization` header (already sent by `api.js`). You can remove the `x-supabase-auth` check and use a cookie or header that reflects “has valid token” if you need middleware to redirect before hitting the backend.

### 3.4 Env and cleanup

- Remove from `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Remove any Supabase-specific keys from `localStorage` in sign-out (you already clear `token` and admin cookie; that’s enough once Supabase is gone).

---

## Step 4: Data Migration (if you have existing Postgres data)

1. Export from PostgreSQL: resumes, companies, keywords, users, and junction tables (e.g. CSV or JSON).
2. Transform IDs from integer to ObjectId (or string) and relationship fields to match Mongoose schemas.
3. Import into MongoDB (e.g. with a one-off script using Mongoose models or `mongoimport`).

---

## Checklist

- [ ] Backend: Mongoose connection and models (User, Resume, Company, Keyword).
- [ ] Backend: All resume/company/keyword controllers rewritten for Mongoose.
- [ ] Backend: Member register/login routes and JWT; `GET /auth/me` supports member JWT.
- [ ] Backend: Auth middleware allows both admin and member where appropriate.
- [ ] Frontend: Supabase packages and files removed; new auth context uses backend only.
- [ ] Frontend: All pages and components use new auth hook and provider.
- [ ] Middleware and env updated; Supabase env vars removed.
- [ ] Optional: migrate existing Postgres data into MongoDB.

If you want, the next step can be concrete code changes: backend Mongoose models + member auth routes, then frontend auth context and removal of Supabase.
