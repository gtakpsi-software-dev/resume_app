# Business Fraternity Resume Database

A web application for managing and searching through a collection of member resumes for a business fraternity.

## Features

- **Resume Search**: Search for resumes by name, major, companies, or keywords
- **Filtering**: Filter resumes by major, company, and graduation year
- **PDF Viewing**: View and download resumes directly in the browser
- **Admin Upload**: Secure admin portal for uploading new resumes with metadata
- **Authentication**: Basic authentication to protect the admin area

## Tech Stack

- **Frontend**: Next.js with JavaScript and Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: MongoDB (Mongoose + GridFS for PDFs)
- **Auth**: JWT (admin + member)
- **Deployment**: Vercel (frontend), backend TBD

## Getting Started

**First time on the project?** See **[SETUP.md](./SETUP.md)** for full instructions: env files, API keys, MongoDB, and how to run frontend + backend. The repo does not include `.env` or `.env.local` (they are gitignored).

### Quick start (after env is set up)

1. **Backend:** `cd backend && npm install && npm run dev`
2. **Frontend:** from project root, `npm install && npm run dev`
3. Open [http://localhost:3000](http://localhost:3000)

## Usage

### User Access

- Visit the homepage and click "Search Resumes" to browse the resume database
- Use the search bar to find specific resumes
- Apply filters to narrow down results
- Click "View PDF" to view a resume directly in the browser

### Admin Access

- Use the "•••" (Admin login) link in the header to open the admin login page.
- The admin password is configured in the backend; ask a project lead for it (it is not stored in the repo).
- Once logged in, you can access the upload page to add new resumes.
