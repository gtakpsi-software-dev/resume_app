# Resume Database Backend

Express API for the Resume Database: auth (admin + member), resume CRUD, and PDF storage in MongoDB GridFS.

## Tech stack

- Node.js, Express
- MongoDB (Mongoose) + GridFS for PDFs
- JWT auth (admin and member)
- Multer for uploads
- Optional: Google Gemini for resume parsing

## Prerequisites

- Node.js 18+
- MongoDB (Atlas or local)

## Setup

See the **root [SETUP.md](../SETUP.md)** for full instructions. Summary:

1. **Install:** `npm install`
2. **Env:** Create **`backend/.env`** with at least:
   - `MONGODB_URI` – connection string (from lead or your Atlas)
   - `JWT_SECRET` – shared team secret (from lead)
   - Optional: `GEMINI_API_KEY`, `UPLOAD_LIMIT`
3. **Run:** `npm run dev`

## Scripts

| Command      | Description                    |
|-------------|--------------------------------|
| `npm run dev`  | Start with nodemon             |
| `npm start`    | Production start               |
| `npm run seed` | Seed DB (optional test user)   |

## API (base path `/api`)

### Auth

- `POST /auth/admin/login` – admin login (password)
- `POST /auth/register` – member sign-up (email, password, firstName, lastName, accessCode)
- `POST /auth/member/login` – member login
- `POST /auth/login` – unified (admin or member by body shape)
- `GET /auth/me` – current user (admin or member)

### Resumes

- `GET /resumes/search` – search with query params
- `GET /resumes/filters` – filter options
- `GET /resumes/:id` – resume metadata
- `GET /resumes/:id/file` – stream PDF (GridFS)
- `POST /resumes` – upload (auth required)
- `PUT /resumes/:id` – update (auth required)
- `DELETE /resumes/:id` – soft delete (auth required)
- `DELETE /resumes/all/delete` – admin only

Admin password and member access code are in the codebase; ask a lead — they are not committed in plain text in docs.
