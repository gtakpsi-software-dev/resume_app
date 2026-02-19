const { Resume, Company, Keyword, User } = require('../models');
const { uploadFile, deleteFile, s3Client } = require('../utils/s3');
const { parseResume } = require('../utils/resumeParser');
const mongoose = require('mongoose');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

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
  let s3Key = null;
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

    // Generate S3 key for the file
    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 100); // Ensure sanitization doesn't create empty string
    const safeSanitizedName = sanitizedName || `resume_${timestamp}`; // Fallback if name sanitization results in empty
    s3Key = `resumes/${safeSanitizedName}_${timestamp}.pdf`;

    // Upload file to S3 with proper error handling
    currentStep = 's3_upload';
    let pdfUrl;
    try {
      console.log(`[${originalFilename}] Uploading file to S3 as: ${s3Key}`);
      pdfUrl = await uploadFile(
        req.file.buffer,
        s3Key,
        'application/pdf'
      );
      console.log(`[${originalFilename}] S3 upload successful: ${pdfUrl}`);
    } catch (s3Error) {
      // Critical failure: S3 upload failed. We cannot proceed without the file URL.
      console.error(`[${originalFilename}] CRITICAL S3 upload error for key ${s3Key}:`, s3Error);
      await session.abortTransaction();
      await session.endSession();
      throw new Error(`S3 upload failed: ${s3Error.message}`);
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
        pdfUrl, // Use the confirmed S3 URL
        s3Key,   // Use the confirmed S3 key
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
        pdfUrl: resume.pdfUrl,
        // Include parsing error message if one occurred, even on success
        parsingWarning: parsingErrorMessage,
        companies: uniqueCompanyList, // Return the unique lists used
        keywords: uniqueKeywordList
      }
    });
  } catch (error) {
    console.error(`[${originalFilename}] Upload failed at step: ${currentStep}. Error: ${error.message}`);

    // Abort transaction if it exists and hasn't been committed
    if (session.inTransaction()) {
      try {
        console.log(`[${originalFilename}] Aborting transaction due to error...`);
        await session.abortTransaction();
         console.log(`[${originalFilename}] Transaction aborted successfully.`);
      } catch (abortError) {
        console.error(`[${originalFilename}] CRITICAL: Error aborting transaction:`, abortError);
      }
    }
    await session.endSession();

    // If we created an S3 file but the database operation failed AFTER S3 upload, try to clean up the S3 file
    // Only attempt delete if s3Key is set AND the error occurred AFTER s3_upload step
    const errorAfterS3 = ['associate_companies', 'associate_keywords', 'database_create', 'transaction_commit'].includes(currentStep);
    if (s3Key && errorAfterS3) {
      try {
        console.log(`[${originalFilename}] Cleaning up S3 file (${s3Key}) after error...`);
        await deleteFile(s3Key);
        console.log(`[${originalFilename}] S3 file cleanup successful.`);
      } catch (deleteError) {
        // Log this error but don't overwrite the original error response
        console.error(`[${originalFilename}] Error cleaning up S3 file (${s3Key}) after failed upload:`, deleteError);
      }
    } else if (s3Key) {
       console.log(`[${originalFilename}] S3 cleanup skipped. Error occurred at or before S3 upload step (${currentStep}).`);
    }

    // Log the detailed error
    console.error(`[${originalFilename}] Full error details:`, JSON.stringify({
      name: error.name,
      message: error.message,
      step: currentStep,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace length
      code: error.code
    }, null, 2));

    // Provide more specific error messages based on the error type and step
    let userMessage = `Error uploading resume "${originalFilename}" during step: ${currentStep}.`;
    if (currentStep === 'resume_parsing') {
      userMessage = `Failed to parse resume content for "${originalFilename}". Please check if the PDF is valid and not password-protected.`;
    } else if (currentStep === 'database_create' && error.message.includes('null')) {
      userMessage = `Failed to save resume "${originalFilename}" due to missing required data (e.g., name, major, grad year) after parsing. Check PDF content.`;
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      userMessage = `A resume similar to "${originalFilename}" might already exist.`;
    } else if (currentStep === 's3_upload' || error.message.includes('S3')) {
      userMessage = `Error storing the file for resume "${originalFilename}". Please try again.`;
    } else {
       // Generic fallback for other errors
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
    
    // Generate signed URLs and format the response
    const formattedResumes = await Promise.all(resumes.map(async (resume) => {
      let signedPdfUrl = null;
      const associatedCompanies = resume.companies ? resume.companies.map(c => c.name) : [];
      const associatedKeywords = resume.keywords ? resume.keywords.map(k => k.name) : [];

      if (resume.s3Key) { // Only generate if s3Key exists
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET,
            Key: resume.s3Key,
          });
          // Generate signed URL valid for 15 minutes (adjust as needed)
          signedPdfUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 }); 
        } catch (urlError) {
          console.error(`Error generating signed URL for key ${resume.s3Key}:`, urlError);
          // Keep signedPdfUrl as null if generation fails
        }
      }

      return {
        id: resume._id,
        name: resume.name,
        major: resume.major,
        graduationYear: resume.graduationYear,
        pdfUrl: resume.pdfUrl, // Keep original URL if needed for other purposes
        signedPdfUrl: signedPdfUrl, // Add the signed URL
        s3Key: resume.s3Key, // Include s3Key for potential debugging
        companies: associatedCompanies,
        keywords: associatedKeywords
      };
    }));
    
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

// Get resume by ID
const getResumeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: 'Invalid resume ID.' });
    }
    
    const resume = await Resume.findOne({ _id: id, isActive: true })
      .populate('companies', 'name')
      .populate('keywords', 'name')
      .populate({
        path: 'uploadedBy',
        select: 'firstName lastName email',
        model: User
      });
    
    if (!resume) {
      return res.status(404).json({ error: true, message: 'Resume not found.' });
    }
    
    // Format the response
    const formattedResume = {
      id: resume._id,
      name: resume.name,
      major: resume.major,
      graduationYear: resume.graduationYear,
      pdfUrl: resume.pdfUrl,
      companies: resume.companies ? resume.companies.map(c => c.name) : [],
      keywords: resume.keywords ? resume.keywords.map(k => k.name) : [],
      uploader: resume.uploadedBy ? {
        id: resume.uploadedBy._id,
        name: `${resume.uploadedBy.firstName} ${resume.uploadedBy.lastName}`,
        email: resume.uploadedBy.email
      } : null,
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
    
    // Format the response
    const formattedResume = {
      id: updatedResume._id,
      name: updatedResume.name,
      major: updatedResume.major,
      graduationYear: updatedResume.graduationYear,
      pdfUrl: updatedResume.pdfUrl,
      companies: updatedResume.companies ? updatedResume.companies.map(c => c.name) : [],
      keywords: updatedResume.keywords ? updatedResume.keywords.map(k => k.name) : []
    };
    
    res.status(200).json({
      error: false,
      message: 'Resume updated successfully.',
      data: formattedResume
    });
  } catch (error) {
    // Roll back transaction on error
    await session.abortTransaction();
    await session.endSession();
    
    console.error('Resume update error:', error);
    res.status(500).json({ error: true, message: 'Error updating resume.' });
  }
};

// Delete resume
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
    
    // Soft delete the resume
    resume.isActive = false;
    await resume.save({ session });
    
    // Delete the file from S3
    await deleteFile(resume.s3Key);
    
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
    
    // Get all active resumes to delete their S3 files
    const allResumes = await Resume.find({ isActive: true })
      .select('s3Key')
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
    
    // Delete all files from S3
    const deletePromises = allResumes.map(resume => {
      if (resume.s3Key) {
        return deleteFile(resume.s3Key).catch(err => {
          console.error(`Error deleting S3 file ${resume.s3Key}:`, err);
          // Continue with other deletions even if one fails
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
  updateResume,
  deleteResume,
  deleteAllResumes,
  getFilters
};
