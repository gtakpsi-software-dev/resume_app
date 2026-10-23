const { Resume, Company, Keyword, User } = require('../models');
const {
  uploadFile: uploadToGridFS,
  deleteFile: deleteFromGridFS,
  streamFileToResponse,
  readFileToBuffer,
} = require('../utils/gridfs');
const { parseResume } = require('../utils/resumeParser');
const { generateEmbeddings } = require('../utils/voyageService');
const { clean, parseYear, classStatus, keywordMatch, fuse, cosineSimilarity, countBy, byCountThenName } = require('../utils/resumeSearch');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');

const caseInsensitive = { locale: 'en', strength: 2 };

const findOrCreateByName = async (Model, names) => {
  const docs = [];
  for (const raw of names || []) {
    const name = String(raw).trim();
    if (!name) continue;
    try {
      docs.push(await Model.findOneAndUpdate({ name }, { $setOnInsert: { name } }, { upsert: true, new: true, collation: caseInsensitive }));
    } catch (error) {
      if (error.code !== 11000) throw error;
      docs.push(await Model.findOne({ name }).collation(caseInsensitive));
    }
  }
  return docs;
};

const findOrCreateCompanies = (names) => findOrCreateByName(Company, names);
const findOrCreateKeywords = (names) => findOrCreateByName(Keyword, names);

const extractContactInfo = (text) => {
  if (!text || typeof text !== 'string') {
    return { email: '', phone: '', linkedin: '' };
  }

  const normalizedText = text.replace(/\s+/g, ' ');

  const emailMatch = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0].trim() : '';

  const phoneMatch = normalizedText.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  const linkedinMatch = normalizedText.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-_%]+\/?/i
  );
  let linkedin = linkedinMatch ? linkedinMatch[0].trim() : '';
  if (linkedin && !/^https?:\/\//i.test(linkedin)) {
    linkedin = `https://${linkedin}`;
  }

  return { email, phone, linkedin };
};

// Upload a new resume
const uploadResume = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let gridfsFileId = null;
  let currentStep = 'initialization';
  const originalFilename = req.file?.originalname || 'Unnamed file';

  try {
    // Log request details for debugging
    console.log(`[${originalFilename}] Starting resume upload. Size: ${req.file?.size || 'unknown'} bytes`);

    currentStep = 'validation';
    if (!req.file) {
      console.error(`[${originalFilename}] Validation failed: No PDF file uploaded.`);
      await session.abortTransaction();
      await session.endSession();
      return res.status(400).json({ error: true, message: 'No PDF file uploaded.' });
    }

    // Check if file buffer is valid
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error(`[${originalFilename}] Validation failed: Empty file content.`);
      await session.abortTransaction();
      await session.endSession();
      return res.status(400).json({ error: true, message: 'Empty file content.' });
    }

    // Check if file is too large (>10MB)
    if (req.file.buffer.length > 10 * 1024 * 1024) {
      console.error(`[${originalFilename}] Validation failed: File too large (${req.file.buffer.length} bytes).`);
      await session.abortTransaction();
      await session.endSession();
      return res.status(400).json({ error: true, message: 'File too large. Maximum file size is 10MB.' });
    }

    // Check PDF header - most PDFs start with %PDF
    const header = req.file.buffer.slice(0, 4).toString();
    if (header !== '%PDF') {
      console.error(`[${originalFilename}] Validation failed: Invalid PDF header "${header}".`);
      await session.abortTransaction();
      await session.endSession();
      return res.status(400).json({ error: true, message: 'Invalid PDF file format.' });
    }
    console.log(`[${originalFilename}] Validation successful.`);

    // Parse the resume to extract information
    console.log(`[${originalFilename}] Parsing resume...`);
    currentStep = 'resume_parsing';

    // Extract the filename without extension as a fallback name
    const filenameWithoutExt = req.file.originalname
      ? req.file.originalname.replace(/\.[^/.]+$/, "") // Remove file extension
      : `Resume_${Date.now()}`;

    let parsedData;
    let parsingErrorMessage = null;
    try {
      // Parse the resume (filename used as fallback)
      parsedData = await parseResume(req.file.buffer, filenameWithoutExt);
      console.log(`[${originalFilename}] Parsing successful. Extracted name: ${parsedData?.name}`);
    } catch (parseError) {
      parsingErrorMessage = parseError.message || "Unknown parsing error";
      console.error(`[${originalFilename}] Error during resume parsing: ${parsingErrorMessage}. Using fallback data.`, parseError);
      // Use fallback data structure
      parsedData = {
        name: filenameWithoutExt, // Use filename as fallback name
        major: 'Unspecified',
        graduationYear: 'Unspecified',
        email: '',
        phone: '',
        linkedin: '',
        companies: [],
        keywords: [],
        rawText: ''
      };
    }

    currentStep = 'data_processing';
    console.log(`[${originalFilename}] Processing extracted/fallback data...`);

    // Get name from form or extract from PDF filename
    let name = req.body.name;

    // If name is not provided in the form, use the parsed name or filename
    if (!name) {
      // First, check if we have a name in the parsed data
      if (parsedData.name && parsedData.name.trim() !== '') {
        name = parsedData.name;
        console.log(`[${originalFilename}] Using parsed name: ${name}`);
      } else {
        // Use filename as last resort
        name = filenameWithoutExt;
        console.log(`[${originalFilename}] Using filename as fallback name: ${name}`);
      }
    } else {
      console.log(`[${originalFilename}] Using provided name from form: ${name}`);
    }

    // Ensure name is not empty and properly formatted
    if (!name || name.trim() === '') {
      name = `Unknown_Resume_${Date.now()}`;
      console.warn(`[${originalFilename}] Name was empty, defaulted to: ${name}`);
    }

    // Truncate name if it's too long for the database
    if (name.length > 255) {
      console.warn(`[${originalFilename}] Name too long (${name.length} chars), truncating.`);
      name = name.substring(0, 252) + '...';
    }

    // Get data from parsed resume or form inputs (fallback)
    let major = req.body.major || parsedData.major || '';
    let graduationYear = req.body.graduationYear || parsedData.graduationYear || '';
    const email = req.body.email || parsedData.email || '';
    const phone = req.body.phone || parsedData.phone || '';
    const linkedin = req.body.linkedin || parsedData.linkedin || '';

    // Validate major - don't allow empty values
    if (!major || major.trim() === '') {
      console.warn(`[${originalFilename}] Major was empty, defaulting to 'Unspecified'. Parsed value was: "${parsedData.major}"`);
      major = 'Unspecified';
    }

    // Truncate major if it's too long
    if (major.length > 255) {
      console.warn(`[${originalFilename}] Major too long (${major.length} chars), truncating.`);
      major = major.substring(0, 252) + '...';
    }

    // If graduation year is invalid, use a placeholder
    if (!graduationYear || graduationYear.trim() === '') {
      console.warn(`[${originalFilename}] Graduation year was empty, defaulting to 'Unspecified'. Parsed value was: "${parsedData.graduationYear}"`);
      graduationYear = 'Unspecified';
    }

    // Truncate graduation year if needed
    if (graduationYear.length > 255) {
      console.warn(`[${originalFilename}] Graduation year too long (${graduationYear.length} chars), defaulting to 'Unspecified'.`);
      graduationYear = 'Unspecified'; // Default instead of truncating potentially meaningless year
    }

    // Get companies and keywords from parsed data (if not provided)
    let companyList = req.body.companies
      ? req.body.companies.split(',').map(c => c.trim()).filter(Boolean)
      : parsedData.companies || [];

    let keywordList = req.body.keywords
      ? req.body.keywords.split(',').map(k => k.trim()).filter(Boolean)
      : parsedData.keywords || [];

    // Ensure company and keyword lists don't exceed reasonable limits
    if (companyList.length > 100) {
      console.warn(`[${originalFilename}] Truncating company list from ${companyList.length} to 100 items`);
      companyList = companyList.slice(0, 100);
    }

    if (keywordList.length > 100) {
      console.warn(`[${originalFilename}] Truncating keyword list from ${keywordList.length} to 100 items`);
      keywordList = keywordList.slice(0, 100);
    }

    // --- Deduplicate Company and Keyword Lists --- 
    const uniqueCompanyList = [...new Set(companyList)];
    const uniqueKeywordList = [...new Set(keywordList)];

    console.log(`[${originalFilename}] Data processed. Name: "${name}", Major: "${major}", GradYear: "${graduationYear}", Unique Companies: ${uniqueCompanyList.length}, Unique Keywords: ${uniqueKeywordList.length}`);

    // Upload file to GridFS
    currentStep = 'gridfs_upload';
    try {
      const timestamp = Date.now();
      const safeFilename = (originalFilename || `resume_${timestamp}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');
      console.log(`[${originalFilename}] Uploading file to GridFS as: ${safeFilename}`);
      const { fileId } = await uploadToGridFS(req.file.buffer, safeFilename, 'application/pdf');
      gridfsFileId = fileId;
      console.log(`[${originalFilename}] GridFS upload successful. fileId: ${fileId}`);
    } catch (gridfsError) {
      console.error(`[${originalFilename}] CRITICAL GridFS upload error:`, gridfsError);
      await session.abortTransaction();
      await session.endSession();
      throw new Error(`File storage failed: ${gridfsError.message}`);
    }

    // Find or create companies and keywords
    currentStep = 'associate_companies';
    let companyIds = [];
    let keywordIds = [];

    try {
      if (uniqueCompanyList.length > 0) {
        console.log(`[${originalFilename}] Finding/creating ${uniqueCompanyList.length} unique companies...`);
        const companyObjects = await findOrCreateCompanies(uniqueCompanyList);
        companyIds = companyObjects.map(c => c._id);
        console.log(`[${originalFilename}] Companies processed successfully.`);
      } else {
        console.log(`[${originalFilename}] No companies to process.`);
      }
    } catch (companyError) {
      console.error(`[${originalFilename}] Error processing companies: ${companyError.message}. Continuing transaction.`, companyError);
    }

    currentStep = 'associate_keywords';
    try {
      if (uniqueKeywordList.length > 0) {
        console.log(`[${originalFilename}] Finding/creating ${uniqueKeywordList.length} unique keywords...`);
        const keywordObjects = await findOrCreateKeywords(uniqueKeywordList);
        keywordIds = keywordObjects.map(k => k._id);
        console.log(`[${originalFilename}] Keywords processed successfully.`);
      } else {
        console.log(`[${originalFilename}] No keywords to process.`);
      }
    } catch (keywordError) {
      console.error(`[${originalFilename}] Error processing keywords: ${keywordError.message}. Continuing transaction.`, keywordError);
    }

    // Generate embeddings if raw text is available
    let embedding = [];
    if (parsedData.rawText && parsedData.rawText.trim() !== '') {
      try {
        console.log(`[${originalFilename}] Generating embeddings...`);
        const embeddings = await generateEmbeddings(parsedData.rawText);
        if (embeddings && embeddings.length > 0) {
          embedding = embeddings[0];
          console.log(`[${originalFilename}] Embeddings generated successfully.`);
        }
      } catch (embeddingError) {
        console.error(`[${originalFilename}] Error generating embeddings: ${embeddingError.message}. Continuing without vector features.`);
      }
    }

    // Create resume record
    currentStep = 'database_create';
    console.log(`[${originalFilename}] Creating database record...`);

    let resume;
    try {
      resume = await Resume.create([{
        name,
        major,
        graduationYear,
        email,
        phone,
        linkedin,
        fileId: gridfsFileId,
        uploadedBy: req.user.id || 'admin',
        companies: companyIds,
        keywords: keywordIds,
        rawText: parsedData.rawText,
        embedding: embedding
      }], { session });
      resume = resume[0];
      console.log(`[${originalFilename}] Database record created successfully. ID: ${resume._id}`);
    } catch (dbError) {
      console.error(`[${originalFilename}] Database create error:`, dbError);
      await session.abortTransaction();
      await session.endSession();
      throw new Error(`Database create failed: ${dbError.message}`);
    }

    // Commit transaction
    currentStep = 'transaction_commit';
    console.log(`[${originalFilename}] Committing transaction...`);
    await session.commitTransaction();
    await session.endSession();
    console.log(`[${originalFilename}] Transaction committed. Upload complete.`);

    res.status(201).json({
      error: false,
      message: `Resume "${originalFilename}" uploaded successfully.`,
      data: {
        id: resume._id,
        name: resume.name,
        major: resume.major,
        graduationYear: resume.graduationYear,
        email: resume.email || '',
        phone: resume.phone || '',
        linkedin: resume.linkedin || '',
        parsingWarning: parsingErrorMessage,
        companies: uniqueCompanyList,
        keywords: uniqueKeywordList
      }
    });
  } catch (error) {
    console.error(`[${originalFilename}] Upload failed at step: ${currentStep}. Error: ${error.message}`);

    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error(`[${originalFilename}] CRITICAL: Error aborting transaction:`, abortError);
      }
    }
    await session.endSession();

    // Clean up GridFS file if we uploaded but DB failed after
    const errorAfterGridFS = ['associate_companies', 'associate_keywords', 'database_create', 'transaction_commit'].includes(currentStep);
    if (gridfsFileId && errorAfterGridFS) {
      try {
        await deleteFromGridFS(gridfsFileId);
      } catch (deleteError) {
        console.error(`[${originalFilename}] Error cleaning up GridFS file after failed upload:`, deleteError);
      }
    }

    console.error(`[${originalFilename}] Full error details:`, error.message);

    let userMessage = `Error uploading resume "${originalFilename}" during step: ${currentStep}.`;
    if (currentStep === 'resume_parsing') {
      userMessage = `Failed to parse resume content for "${originalFilename}". Please check if the PDF is valid and not password-protected.`;
    } else if (currentStep === 'database_create' && error.message.includes('null')) {
      userMessage = `Failed to save resume "${originalFilename}" due to missing required data. Check PDF content.`;
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      userMessage = `A resume similar to "${originalFilename}" might already exist.`;
    } else if (currentStep === 'gridfs_upload' || error.message.includes('storage')) {
      userMessage = `Error storing the file for resume "${originalFilename}". Please try again.`;
    } else {
      userMessage = `An unexpected error occurred while processing "${originalFilename}": ${error.message}`;
    }

    res.status(500).json({ error: true, message: userMessage, details: error.message });
  }
};

const VECTOR_HITS = 30;
const VECTOR_SCORE_GAP = 0.05;

const closeToBest = (hits) => {
  const best = hits[0]?.score ?? 0;
  return hits.filter((h) => h.score >= best - VECTOR_SCORE_GAP).slice(0, VECTOR_HITS).map((h) => h.id);
};

const vectorRanking = async (q) => {
  let embedding;
  try {
    [embedding] = (await generateEmbeddings(q)) || [];
  } catch {
    return null;
  }
  if (!embedding) return null;

  try {
    const hits = await Resume.aggregate([
      { $vectorSearch: { index: 'vector_index', path: 'embedding', queryVector: embedding, numCandidates: 200, limit: 100 } },
      { $match: { isActive: true } },
      { $project: { _id: 1, score: { $meta: 'vectorSearchScore' } } },
    ]);
    return closeToBest(hits.map((h) => ({ id: String(h._id), score: h.score })));
  } catch (error) {
    const message = error.message || '';
    const atlasUnavailable = ['$vectorSearch', 'vector_index', 'not enabled', 'Unrecognized pipeline stage'].some((m) =>
      message.includes(m)
    );
    if (!atlasUnavailable) return null;
  }

  const embedded = await Resume.find({ isActive: true, embedding: { $exists: true, $ne: [] } }).select('embedding').lean();
  return closeToBest(
    embedded
      .map((r) => ({ id: String(r._id), score: (1 + cosineSimilarity(embedding, r.embedding)) / 2 }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
  );
};

const listParam = (value) => new Set(String(value || '').split(',').map((v) => v.trim()).filter(Boolean));

const searchResumes = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const filters = {
      major: listParam(req.query.major),
      company: listParam(req.query.company),
      graduationYear: listParam(req.query.graduationYear),
      status: ['student', 'alumni'].includes(req.query.status) ? req.query.status : null,
    };
    const sort = ['relevance', 'name', 'class'].includes(req.query.sort) ? req.query.sort : q ? 'relevance' : 'name';

    const docs = await Resume.find({ isActive: true })
      .select('-rawText -embedding')
      .populate('companies', 'name')
      .populate('keywords', 'name')
      .lean();

    const now = new Date();
    const resumes = docs.map((doc) => {
      const year = parseYear(doc.graduationYear);
      return {
        id: String(doc._id),
        name: doc.name,
        major: clean(doc.major),
        graduationYear: clean(doc.graduationYear),
        year,
        status: classStatus(year, now),
        companies: (doc.companies || []).map((c) => clean(c.name)).filter(Boolean),
        keywords: (doc.keywords || []).map((k) => clean(k.name)).filter(Boolean),
        email: doc.email || '',
        phone: doc.phone || '',
        linkedin: doc.linkedin || '',
      };
    });

    let mode = 'browse';
    let candidates = resumes;
    const scores = new Map();
    const reasons = new Map();

    if (q) {
      const matches = resumes.map((r) => ({ id: r.id, match: keywordMatch(r, q) })).filter((h) => h.match);
      const complete = matches.filter((h) => h.match.complete);
      const keywordHits = (complete.length ? complete : matches).sort((a, b) => b.match.score - a.match.score);
      keywordHits.forEach((h) => reasons.set(h.id, h.match.reasons));

      const vectorIds = await vectorRanking(q).catch(() => null);
      mode = vectorIds ? 'hybrid' : 'keyword';
      (vectorIds || []).forEach((id) => !reasons.has(id) && reasons.set(id, ['Similar experience']));

      fuse([keywordHits.map((h) => h.id), vectorIds || []]).forEach((score, id) => scores.set(id, score));
      candidates = resumes.filter((r) => scores.has(r.id));
    }

    const passes = (r, except) =>
      (except === 'major' || !filters.major.size || filters.major.has(r.major)) &&
      (except === 'company' || !filters.company.size || r.companies.some((c) => filters.company.has(c))) &&
      (except === 'graduationYear' || !filters.graduationYear.size || filters.graduationYear.has(String(r.year))) &&
      (except === 'status' || !filters.status || r.status === filters.status);

    const facets = {
      majors: countBy(candidates.filter((r) => passes(r, 'major')), (r) => [r.major]).sort(byCountThenName),
      companies: countBy(candidates.filter((r) => passes(r, 'company')), (r) => r.companies).sort(byCountThenName),
      graduationYears: countBy(candidates.filter((r) => passes(r, 'graduationYear')), (r) => [r.year ? String(r.year) : ''])
        .sort((a, b) => b.value.localeCompare(a.value)),
      status: candidates
        .filter((r) => passes(r, 'status'))
        .reduce((acc, r) => (r.status ? { ...acc, [r.status]: acc[r.status] + 1 } : acc), { student: 0, alumni: 0 }),
    };

    const byName = (a, b) => a.name.localeCompare(b.name);
    const comparators = {
      relevance: (a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0) || byName(a, b),
      name: byName,
      class: (a, b) => (b.year || 0) - (a.year || 0) || byName(a, b),
    };

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const data = candidates
      .filter((r) => passes(r))
      .sort(comparators[sort])
      .map(({ year, ...r }) => {
        const pdfUrl = `${baseUrl}/api/resumes/${r.id}/file`;
        const score = scores.get(r.id);
        return {
          ...r,
          pdfUrl,
          signedPdfUrl: pdfUrl,
          score: score ? Math.round(score * 10000) / 10000 : null,
          reasons: reasons.get(r.id) || [],
        };
      });

    res.status(200).json({ error: false, count: data.length, mode, data, facets });
  } catch (error) {
    console.error('Resume search error:', error);
    res.status(500).json({ error: true, message: 'Error searching resumes.' });
  }
};

// Stream PDF file from GridFS (GET /resumes/:id/file)
const getResumeFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: 'Invalid resume ID.' });
    }
    const resume = await Resume.findOne({ _id: id, isActive: true }).select('fileId name').lean();
    if (!resume || !resume.fileId) {
      return res.status(404).json({ error: true, message: 'Resume or file not found.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${(resume.name || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf"`);
    await streamFileToResponse(resume.fileId, res);
  } catch (error) {
    console.error('Get resume file error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: true, message: 'Error retrieving file.' });
    }
  }
};

// Get resume by ID
const getResumeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: 'Invalid resume ID.' });
    }

    const resume = await Resume.findOne({ _id: id, isActive: true })
      .populate('companies', 'name')
      .populate('keywords', 'name');

    if (!resume) {
      return res.status(404).json({ error: true, message: 'Resume not found.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const pdfUrl = resume.fileId ? `${baseUrl}/api/resumes/${resume._id}/file` : null;
    const formattedResume = {
      id: resume._id,
      name: resume.name,
      major: resume.major,
      graduationYear: resume.graduationYear,
      email: resume.email || '',
      phone: resume.phone || '',
      linkedin: resume.linkedin || '',
      pdfUrl,
      companies: resume.companies ? resume.companies.map(c => c.name) : [],
      keywords: resume.keywords ? resume.keywords.map(k => k.name) : [],
      uploader: resume.uploadedBy ? { id: resume.uploadedBy } : null,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt
    };

    res.status(200).json({
      error: false,
      data: formattedResume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: true, message: 'Error retrieving resume.' });
  }
};

// Update resume
const updateResume = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { name, major, graduationYear, email, phone, linkedin, companies, keywords } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(400).json({ error: true, message: 'Invalid resume ID.' });
    }

    // Find the resume
    const resume = await Resume.findOne({ _id: id, isActive: true }).session(session);

    if (!resume) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(404).json({ error: true, message: 'Resume not found.' });
    }

    // Check if the user has permission to update this resume
    if (req.user.role !== 'admin' && resume.uploadedBy !== req.user.id) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(403).json({ error: true, message: 'Permission denied.' });
    }

    // Update resume fields
    if (name) resume.name = name;
    if (major) resume.major = major;
    if (graduationYear) resume.graduationYear = graduationYear;

    if (email !== undefined) resume.email = email || '';
    if (phone !== undefined) resume.phone = phone || '';
    if (linkedin !== undefined) resume.linkedin = linkedin || '';
    
    // Update companies if provided
    if (companies) {
      const companyList = companies.split(',').map(c => c.trim()).filter(Boolean);
      const companyObjects = await findOrCreateCompanies(companyList);
      resume.companies = companyObjects.map(c => c._id);
    }

    // Update keywords if provided
    if (keywords) {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const keywordObjects = await findOrCreateKeywords(keywordList);
      resume.keywords = keywordObjects.map(k => k._id);
    }

    await resume.save({ session });

    // Commit transaction
    await session.commitTransaction();
    await session.endSession();

    // Reload with populated fields
    const updatedResume = await Resume.findById(resume._id)
      .populate('companies', 'name')
      .populate('keywords', 'name');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const pdfUrl = updatedResume.fileId ? `${baseUrl}/api/resumes/${updatedResume._id}/file` : null;
    const formattedResume = {
      id: updatedResume._id,
      name: updatedResume.name,
      major: updatedResume.major,
      graduationYear: updatedResume.graduationYear,
      email: updatedResume.email || '',
      phone: updatedResume.phone || '',
      linkedin: updatedResume.linkedin || '',
      pdfUrl,
      companies: updatedResume.companies ? updatedResume.companies.map(c => c.name) : [],
      keywords: updatedResume.keywords ? updatedResume.keywords.map(k => k.name) : []
    };

    res.status(200).json({
      error: false,
      message: 'Resume updated successfully.',
      data: formattedResume
    });
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error('Resume update error:', error);
    res.status(500).json({ error: true, message: 'Error updating resume.' });
  }
};

// Delete resume (soft delete)
const deleteResume = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(400).json({ error: true, message: 'Invalid resume ID.' });
    }

    // Find the resume
    const resume = await Resume.findOne({ _id: id, isActive: true }).session(session);

    if (!resume) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(404).json({ error: true, message: 'Resume not found.' });
    }

    // Check if the user has permission to delete this resume
    if (req.user.role !== 'admin' && resume.uploadedBy !== req.user.id) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(403).json({ error: true, message: 'Permission denied.' });
    }
    
    // Soft delete the resume (keep file for delayed cleanup)
    resume.isActive = false;
    resume.deletedAt = new Date();
    await resume.save({ session });
    
    // Commit transaction
    await session.commitTransaction();
    await session.endSession();

    res.status(200).json({
      error: false,
      message: 'Resume deleted successfully.'
    });
  } catch (error) {
    // Roll back transaction on error
    await session.abortTransaction();
    await session.endSession();

    console.error('Resume delete error:', error);
    res.status(500).json({ error: true, message: 'Error deleting resume.' });
  }
};

const deleteAllResumes = async (req, res) => {
  try {
    const { modifiedCount } = await Resume.updateMany(
      { isActive: true },
      { isActive: false, deletedAt: new Date() }
    );

    if (!modifiedCount) {
      return res.status(404).json({ error: true, message: 'No active resumes found to delete.' });
    }

    res.status(200).json({
      error: false,
      message: `Successfully deleted ${modifiedCount} resumes.`
    });
  } catch (error) {
    console.error('Delete all resumes error:', error);
    res.status(500).json({ error: true, message: 'Error deleting all resumes.' });
  }
};

const backfillResumeContacts = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: true, message: 'Permission denied. Admin access required.' });
    }

    const resumes = await Resume.find({ isActive: true })
      .select('name fileId email phone linkedin')
      .lean();

    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    const failures = [];

    for (const resume of resumes) {
      scanned += 1;
      const hasAllContactInfo = resume.email && resume.phone && resume.linkedin;
      if (hasAllContactInfo || !resume.fileId) {
        skipped += 1;
        continue;
      }

      try {
        const pdfBuffer = await readFileToBuffer(resume.fileId);
        const parsed = await pdfParse(pdfBuffer);
        const contact = extractContactInfo(parsed.text || '');

        const updates = {};
        if (!resume.email && contact.email) updates.email = contact.email;
        if (!resume.phone && contact.phone) updates.phone = contact.phone;
        if (!resume.linkedin && contact.linkedin) updates.linkedin = contact.linkedin;

        if (Object.keys(updates).length > 0) {
          await Resume.updateOne({ _id: resume._id }, { $set: updates });
          updated += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failures.push({
          id: resume._id,
          name: resume.name || 'Unknown',
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      error: false,
      message: 'Contact backfill completed.',
      data: {
        scanned,
        updated,
        skipped,
        failed: failures.length,
        failures: failures.slice(0, 25),
      },
    });
  } catch (error) {
    console.error('Backfill resume contacts error:', error);
    return res.status(500).json({ error: true, message: 'Error backfilling resume contacts.' });
  }
};

module.exports = {
  uploadResume,
  searchResumes,
  getResumeById,
  getResumeFile,
  updateResume,
  deleteResume,
  deleteAllResumes,
  backfillResumeContacts,
};
