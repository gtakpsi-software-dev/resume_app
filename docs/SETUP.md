# Project setup guide

Use this guide when you first clone the repo so you can run the app locally. **Never commit real API keys or passwords to the repo.**

---

## Prerequisites

- **Node.js** 18+ (check with `node -v`)
- **npm** (comes with Node)
- **Git**
- Access to the team’s **MongoDB** (Atlas cluster or connection string from a lead)
- (Optional) **Google Gemini API key** for smarter resume parsing

---

## 1. Clone and install

```bash
# Clone the repo (use your fork or the club repo)
cd resume_app

# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

---

## 2. Backend environment variables

The backend needs a `.env` file. **This file is gitignored** — you have to create it yourself.

Create **`backend/.env`** with:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB – Connection string for the AKPsi Resume App
# Replace YOUR_USER and YOUR_PASSWORD with your specific Atlas credentials
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@gtakpsi-db.fuousxc.mongodb.net/resume_db?retryWrites=true&w=majority&appName=gtakpsi-db



# JWT – use a long random string (e.g. from https://generate-secret.vercel.app/32)
# Everyone on the team can use the same value so tokens work across dev machines
JWT_SECRET=your_jwt_secret_here_ask_lead_for_team_value

# Optional: max PDF upload size in MB (default 10)
UPLOAD_LIMIT=10

# Optional: only needed for AI-powered resume parsing (Gemini). If missing, parsing uses fallbacks.
# Get a key at https://aistudio.google.com/app/apikey
# GEMINI_API_KEY=your_gemini_api_key_here
```

**Important:**

- **MONGODB_URI** – Ask a project lead for the shared connection string (or create your own Atlas user and get a URI). Do not commit this file.
- **JWT_SECRET** – Should be the same for everyone on the team (so tokens from one dev aren’t invalid on another). Get it from a lead or agree on one value.
- **GEMINI_API_KEY** – Optional. Without it, resume uploads still work; parsing may be less accurate.

---

## 3. Frontend environment variables

The frontend needs a `.env.local` file. **This file is gitignored** — you have to create it yourself.

Create **`.env.local`** in the **project root** (same folder as `package.json`):

```env
# Backend API base URL – use this when running backend locally
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api
```

For production or a deployed backend, change this to that backend’s URL (e.g. `https://your-api.vercel.app/api`).

---

## 4. MongoDB access

- If the team uses **MongoDB Atlas**, a lead will:
  - Add your Atlas user (or give you the shared URI), and
  - Add your IP (or 0.0.0.0/0 for dev) under **Network Access**.
- If you run **MongoDB locally**, use:
  ```env
  MONGODB_URI=mongodb://localhost:27017/resume_db
  ```

---

## 5. Run the app

**Terminal 1 – backend**

```bash
cd backend
npm run dev
```

You should see something like: `MongoDB Connected` and `Server running on port 5000`.

**Terminal 2 – frontend**

```bash
# From project root
npm run dev
```

Open **http://localhost:3000**.

---

## 6. Logins (don’t commit these; share via secure channel)

- **Admin:** Use the admin login page. The password is set in the backend code (ask a lead; it’s not in this doc to avoid leaking it in the repo).
- **Member sign-up:** New members need the **access code** to register. Ask a lead for the current code (it’s in the backend).

---

## 7. Quick checklist

- [ ] Repo cloned, `npm install` run in root and in `backend`
- [ ] **backend/.env** created with `MONGODB_URI`, `JWT_SECRET`, and optional `GEMINI_API_KEY`
- [ ] **.env.local** created in project root with `NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api`
- [ ] MongoDB reachable (Atlas user + IP, or local MongoDB running)
- [ ] Backend runs without errors (`npm run dev` in `backend`)
- [ ] Frontend runs without errors (`npm run dev` in root)
- [ ] You can open http://localhost:3000 and (if applicable) log in as admin or member

---

## Troubleshooting

| Issue                      | What to check                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `MongoDB connection error` | Correct `MONGODB_URI`, network access (Atlas IP allowlist), and that the DB is running.                     |
| `GEMINI_API_KEY not found` | Add `GEMINI_API_KEY` to `backend/.env` or leave it out (parsing will use fallbacks).                        |
| Frontend can’t reach API   | Backend running on port 5000; `NEXT_PUBLIC_BACKEND_URL` is `http://localhost:5000/api` (no trailing slash). |
| 401 on login               | `JWT_SECRET` in `backend/.env` matches what the server expects (same as other devs if sharing).             |

If something isn’t covered here, check **docs/** (e.g. PROJECT_FILE_BREAKDOWN.md, migration docs) or ask the team.
