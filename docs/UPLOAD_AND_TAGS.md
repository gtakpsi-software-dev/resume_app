# How upload and tags (companies/keywords) work

## Upload flow (high level)

1. **Admin** selects PDF(s) on the upload page and submits. The frontend sends **only the file** (no manual tags in the form).
2. **Backend** receives the PDF and:
   - Extracts text from the PDF (`pdf-parse`).
   - Runs **AI parsing** (Google Gemini) on that text to get **name, major, graduation year, companies, and keywords**.
   - If the form had sent `companies` or `keywords`, those would be used; currently the form does **not** send them, so tags come **only from the parser**.
   - Saves the PDF to GridFS and creates a Resume document with the parsed metadata and the **fileId** of the PDF.

So **tags (companies and keywords) are filled only by the backend parser**. The upload form does not have fields for typing them in.

---

## Where tags come from (code path)

```
Upload page:  resumeAPI.create({}, file)   →  only the file is sent
       ↓
resumeController.uploadResume:
  parsedData = await parseResume(req.file.buffer, filename)
  companyList = req.body.companies || parsedData.companies   ← body is empty, so parsedData only
  keywordList = req.body.keywords || parsedData.keywords    ← same
       ↓
resumeParser.parseResume():
  1. extractTextFromPdf(buffer)  →  raw text from PDF
  2. parseResumeWithGemini(text)  →  returns { name, major, graduationYear, companies, keywords }
       ↓
  If GEMINI_API_KEY is missing or Gemini fails:
    → catch block returns fallback: companies: [], keywords: []
```

So if **GEMINI_API_KEY** is not set (or Gemini errors), the parser catches the error and returns **empty companies and keywords**. The resume still uploads, but with **no tags**.

---

## Why you might see no tags

| Cause | What happens |
|-------|----------------|
| **GEMINI_API_KEY not in backend/.env** | `parseResumeWithGemini` throws → parser returns fallback with `companies: []`, `keywords: []`. |
| **Gemini API error** (quota, network, invalid key) | Same: exception caught, fallback with empty tags. |
| **PDF has no extractable text** (e.g. scanned image, no OCR) | `extractTextFromPdf` returns an error message string → parser uses fallback with empty tags. |
| **PDF parsing timeout** | Treated as error → fallback with empty tags. |

So the most common case is: **no tags because GEMINI_API_KEY is missing or invalid**, so the AI step is never run and the backend falls back to empty companies/keywords.

---

## How to get tags on upload

1. **Set up Gemini (recommended)**  
   - Get an API key: [Google AI Studio](https://aistudio.google.com/app/apikey).  
   - In **`backend/.env`** add:
     ```env
     GEMINI_API_KEY=your_key_here
     ```
   - Restart the backend and upload again. The same PDF should then get companies and keywords from the AI parser.

2. **Add tags after upload**  
   - You can edit a resume later (if the app has an edit flow) and set companies/keywords manually. The backend supports `PUT /resumes/:id` with `companies` and `keywords` in the body (e.g. comma‑separated).

3. **Optional: manual tags on upload (future)**  
   - The backend already accepts `req.body.companies` and `req.body.keywords`. You could add optional fields on the upload form and pass them into `resumeAPI.create({ companies: '...', keywords: '...' }, file)` so tags don’t rely only on the parser.

---

## Summary

- **Tags = companies and keywords** come from the **backend parser** (Gemini), not from the upload form.
- **No tags** usually means **GEMINI_API_KEY** is missing or Gemini failed, so the parser returns empty arrays.
- **Fix:** Add a valid **GEMINI_API_KEY** to **`backend/.env`** and restart the backend; then re-upload or edit the resume to get tags.
