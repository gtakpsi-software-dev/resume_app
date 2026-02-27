const { Resume, Company, Keyword, User } = require('../models');
const { uploadFile: uploadToGridFS, deleteFile: deleteFromGridFS, streamFileToResponse } = require('../utils/gridfs');
const { parseResume } = require('../utils/resumeParser');
const mongoose = require('mongoose');

/**
 * Format text in title case (first letter of each word capitalized, rest lowercase)
 * @param {string} text - The text to format
 * @returns {string} - Properly formatted text
 */
const formatTitleCase = (text) => {
  if (!text) return '';
  
  // Handle special cases for company abbreviations
  const commonAbbreviations = ['LLC', 'LLP', 'Inc', 'Corp', 'Ltd', 'Co', 'USA', 'US', 'UK', 'AI', 'IT', 'IBM', 'HP', 'AWS', 'GE'];
  const commonLowercase = ['of', 'the', 'and', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'to'];
  
  // Split by spaces and format each word
  return text.split(' ')
    .map((word, index) => {
      // Check if the word is a common abbreviation (case sensitive)
      if (commonAbbreviations.includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      
      // For articles, prepositions, and conjunctions, keep lowercase unless it's the first word
      if (index > 0 && commonLowercase.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      
      // Default formatting: first letter uppercase, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Helper function to find or create companies
const findOrCreateCompanies = async (companyNames) => {
  if (!companyNames || !companyNames.length) return [];
  
  const companies = [];
  for (const name of companyNames) {
    // Format company name in title case
    const formattedName = formatTitleCase(name.trim());
    
    let company = await Company.findOne({ name: formattedName });
    if (!company) {
      company = await Company.create({ name: formattedName });
    }
    companies.push(company);
  }
  return companies;
};

// Helper function to find or create keywords
const findOrCreateKeywords = async (keywordNames) => {
  if (!keywordNames || !keywordNames.length) return [];
  
  const keywords = [];
  for (const name of keywordNames) {
    const trimmedName = name.trim();
    let keyword = await Keyword.findOne({ name: trimmedName });
    if (!keyword) {
      keyword = await Keyword.create({ name: trimmedName });
    }
    keywords.push(keyword);
  }
  return keywords;
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
        companies: [],
        keywords: []
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

    // Create resume record
    currentStep = 'database_create';
    console.log(`[${originalFilename}] Creating database record...`);

    let resume;
    try {
      resume = await Resume.create([{
        name,
        major,
        graduationYear,
        fileId: gridfsFileId,
        uploadedBy: req.user.id || 'admin',
        companies: companyIds,
        keywords: keywordIds
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

// Search resumes with filtering
const searchResumes = async (req, res) => {
  try {
    const { query, name, major, company, graduationYear, keyword } = req.query;
    
    // Build MongoDB query
    const resumeQuery = { isActive: true };
    
    // General query search (searches across name, major, graduationYear, companies, keywords)
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      resumeQuery.$or = [
        { name: searchRegex },
        { major: searchRegex },
        { graduationYear: searchRegex }
      ];
    }
    
    // Specific filters
    if (name) {
      resumeQuery.name = new RegExp(name, 'i');
    }
    
    if (major) {
      const majorList = major.split(',').map(m => m.trim()).filter(Boolean);
      if (majorList.length === 1) {
        resumeQuery.major = new RegExp(majorList[0], 'i');
      } else {
        resumeQuery.major = { $in: majorList.map(m => new RegExp(m, 'i')) };
      }
    }
    
    if (graduationYear) {
      const yearList = graduationYear.split(',').map(y => y.trim()).filter(Boolean);
      if (yearList.length === 1) {
        resumeQuery.graduationYear = yearList[0];
      } else {
        resumeQuery.graduationYear = { $in: yearList };
      }
    }
    
    // Company filter - need to find companies first, then filter resumes
    let companyFilter = null;
    if (company) {
      const companyList = company.split(',').map(c => c.trim()).filter(Boolean);
      const companies = await Company.find({ 
        name: { $in: companyList.map(c => new RegExp(c, 'i')) }
      });
      if (companies.length > 0) {
        companyFilter = companies.map(c => c._id);
      } else {
        // No matching companies, return empty result
        return res.status(200).json({
          error: false,
          count: 0,
          data: []
        });
      }
    }
    
    // Keyword filter - need to find keywords first, then filter resumes
    let keywordFilter = null;
    if (keyword) {
      const keywordList = keyword.split(',').map(k => k.trim()).filter(Boolean);
      const keywords = await Keyword.find({ 
        name: { $in: keywordList.map(k => new RegExp(k, 'i')) }
      });
      if (keywords.length > 0) {
        keywordFilter = keywords.map(k => k._id);
      } else {
        // No matching keywords, return empty result
        return res.status(200).json({
          error: false,
          count: 0,
          data: []
        });
      }
    }
    
    // Add company and keyword filters to query
    if (companyFilter) {
      resumeQuery.companies = { $in: companyFilter };
    }
    
    if (keywordFilter) {
      resumeQuery.keywords = { $in: keywordFilter };
    }
    
    // If general query includes company/keyword search, we need to handle it differently
    if (query && (query.includes('company') || query.includes('keyword'))) {
      // This is a simplified approach - for more complex searches, you might want to use aggregation
      const searchRegex = new RegExp(query, 'i');
      const matchingCompanies = await Company.find({ name: searchRegex });
      const matchingKeywords = await Keyword.find({ name: searchRegex });
      
      if (matchingCompanies.length > 0 || matchingKeywords.length > 0) {
        const orConditions = resumeQuery.$or || [];
        if (matchingCompanies.length > 0) {
          resumeQuery.$or = [
            ...orConditions,
            { companies: { $in: matchingCompanies.map(c => c._id) } }
          ];
        }
        if (matchingKeywords.length > 0) {
          resumeQuery.$or = [
            ...(resumeQuery.$or || orConditions),
            { keywords: { $in: matchingKeywords.map(k => k._id) } }
          ];
        }
      }
    }
    
    console.log('Final Search Query:', JSON.stringify(resumeQuery, null, 2));
    
    // Query the database with populate
    const resumes = await Resume.find(resumeQuery)
      .populate('companies', 'name')
      .populate('keywords', 'name')
      .sort({ createdAt: -1 });
    
    // Build file URL for each resume (GridFS stream endpoint)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const formattedResumes = resumes.map((resume) => {
      const associatedCompanies = resume.companies ? resume.companies.map(c => c.name) : [];
      const associatedKeywords = resume.keywords ? resume.keywords.map(k => k.name) : [];
      const fileUrl = resume.fileId ? `${baseUrl}/api/resumes/${resume._id}/file` : null;
      return {
        id: resume._id,
        name: resume.name,
        major: resume.major,
        graduationYear: resume.graduationYear,
        pdfUrl: fileUrl,
        signedPdfUrl: fileUrl,
        companies: associatedCompanies,
        keywords: associatedKeywords
      };
    });
    
    res.status(200).json({
      error: false,
      count: formattedResumes.length,
      data: formattedResumes
    });
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
    const { name, major, graduationYear, companies, keywords } = req.body;
    
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

// Delete all resumes (admin only)
const deleteAllResumes = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Ensure the user is an admin
    if (req.user.role !== 'admin') {
      await session.abortTransaction();
      await session.endSession();
      return res.status(403).json({ error: true, message: 'Permission denied. Admin access required.' });
    }
    
    // Get all active resumes to delete their GridFS files
    const allResumes = await Resume.find({ isActive: true })
      .select('fileId')
      .session(session);
    
    if (allResumes.length === 0) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(404).json({ error: true, message: 'No active resumes found to delete.' });
    }
    
    // Soft delete all resumes
    await Resume.updateMany(
      { isActive: true },
      { isActive: false },
      { session }
    );
    
    // Delete all files from GridFS
    const deletePromises = allResumes.map(resume => {
      if (resume.fileId) {
        return deleteFromGridFS(resume.fileId).catch(err => {
          console.error(`Error deleting GridFS file ${resume.fileId}:`, err);
          return Promise.resolve();
        });
      }
      return Promise.resolve();
    });
    
    await Promise.all(deletePromises);
    
    // Commit transaction
    await session.commitTransaction();
    await session.endSession();
    
    res.status(200).json({
      error: false,
      message: `Successfully deleted ${allResumes.length} resumes.`
    });
  } catch (error) {
    // Roll back transaction on error
    await session.abortTransaction();
    await session.endSession();
    
    console.error('Delete all resumes error:', error);
    res.status(500).json({ error: true, message: 'Error deleting all resumes.' });
  }
};

// Get available filters (majors, companies, graduation years)
const getFilters = async (req, res) => {
  try {
    // Get unique majors
    const majors = await Resume.distinct('major', { 
      isActive: true,
      major: { $ne: '', $exists: true }
    });
    
    // Get unique graduation years
    const graduationYears = await Resume.distinct('graduationYear', { 
      isActive: true,
      graduationYear: { $ne: '', $exists: true }
    });
    
    // Get companies that are associated with active resumes
    const companiesWithResumes = await Company.find({
      _id: { $in: await Resume.distinct('companies', { isActive: true }) }
    }).select('name');
    
    // Get keywords that are associated with active resumes
    const keywordsWithResumes = await Keyword.find({
      _id: { $in: await Resume.distinct('keywords', { isActive: true }) }
    }).select('name');
    
    // Format the response and filter out empty values
    const filters = {
      majors: majors.filter(Boolean).sort(),
      graduationYears: graduationYears.filter(Boolean).sort(),
      companies: companiesWithResumes.map(c => c.name).filter(Boolean).sort(),
      keywords: keywordsWithResumes.map(k => k.name).filter(Boolean).sort()
    };
    
    res.status(200).json({
      error: false,
      data: filters
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: true, message: 'Error retrieving filters.' });
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
  getFilters
};
