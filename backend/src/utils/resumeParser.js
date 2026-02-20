const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelay - Initial delay in milliseconds
 * @param {number} options.maxDelay - Maximum delay in milliseconds
 * @returns {Promise<any>} - Result from the function
 */
const retryWithBackoff = async (fn, options = {}) => {
  const { maxRetries = 3, initialDelay = 2000, maxDelay = 30000 } = options;
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (
        retries >= maxRetries || 
        !error?.status || 
        (error.status !== 429 && error.status !== 503)
      ) {
        // Not a retriable error or max retries reached
        throw error;
      }

      // Get suggested retry delay if provided by API
      let retryDelay = delay;
      if (error.errorDetails && error.errorDetails.length > 0) {
        const retryInfo = error.errorDetails.find(detail => 
          detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        );
        if (retryInfo && retryInfo.retryDelay) {
          const suggestedDelay = retryInfo.retryDelay.replace('s', '') * 1000;
          if (suggestedDelay) {
            retryDelay = Math.max(delay, suggestedDelay);
          }
        }
      }

      console.log(`Rate limit hit. Retrying in ${retryDelay / 1000}s... (Retry ${retries + 1}/${maxRetries})`);
      console.log(`⏳ Please wait - AI service is processing. This may take up to ${Math.ceil(retryDelay / 1000)} seconds...`);
      await sleep(retryDelay);
      
      // Exponential backoff
      delay = Math.min(delay * 2, maxDelay);
      retries++;
    }
  }
};

/**
 * Extract text from a PDF buffer
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromPdf = async (pdfBuffer) => {
  try {
    console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);
    
    // Check if buffer is too small to be a valid PDF
    if (pdfBuffer.length < 100) {
      console.error('PDF buffer too small to be a valid PDF');
      return `Unable to parse PDF content: Buffer too small. This is a fallback text for processing.`;
    }
    
    // Check PDF header - most PDFs start with %PDF
    const header = pdfBuffer.slice(0, 4).toString();
    if (header !== '%PDF') {
      console.error(`Invalid PDF header: ${header}`);
      return `Unable to parse PDF content: Invalid PDF header. This is a fallback text for processing.`;
    }
    
    // Add a timeout to PDF parsing to prevent hanging on corrupt files
    console.log('Starting PDF parsing with timeout protection');
    const pdfParsePromise = pdfParse(pdfBuffer);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('PDF parsing timed out after 15 seconds')), 15000)
    );
    
    // Race between normal parsing and timeout
    const pdfData = await Promise.race([pdfParsePromise, timeoutPromise]);
    
    // Check if PDF data is valid
    if (!pdfData || typeof pdfData !== 'object') {
      console.error('Invalid PDF data structure returned');
      return `Unable to parse PDF content: Invalid data structure. This is a fallback text for processing.`;
    }
    
    // If text is empty or just whitespace, throw an error
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      console.error('PDF parsing returned empty text');
      throw new Error('PDF parsing returned empty text');
    }
    
    console.log(`PDF successfully parsed: ${pdfData.numpages} pages, ${pdfData.text.length} chars`);
    return pdfData.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.stack) console.error('Stack trace:', error.stack);
    
    // Return minimal text instead of failing completely
    return `Unable to parse PDF content: ${error.message}. This is a fallback text for processing.`;
  }
};

/**
 * Format a name in proper title case (first letter of each word capitalized, rest lowercase)
 * @param {string} name - The name to format
 * @returns {string} - Properly formatted name
 */
const formatName = (name) => {
  if (!name) return '';
  
  return name.split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Clean the major field to remove degree information
 * @param {string} major - The extracted major
 * @returns {string} - Cleaned major
 */
const cleanMajor = (major) => {
  if (!major) return '';
  
  // Remove common degree prefixes
  const cleanedMajor = major
    .replace(/^(Bachelor['']s|Bachelor of|Master['']s|Master of|B\.S\.|B\.A\.|M\.S\.|M\.A\.|Ph\.D\.|Doctor of|Associates|A\.S\.|A\.A\.) (of|in|degree in|degree|on|with a focus in|with concentration in|with specialization in)\s*/i, '')
    .replace(/^(BS|BA|MS|MA|PhD) (in|of)\s*/i, '')
    .replace(/^(Bachelor|Master|Doctor|Doctorate|Doctoral|Associate)[^\w]*\s*(of|in|degree)*\s*/i, '')
    .replace(/\s*\((.*?)\)$/, '') // Remove parenthetical content at the end
    .replace(/\s*-\s*(minor|concentration|specialization|focus|honors|track|emphasis)[^\n]*/i, '') // Remove minor info
    .replace(/\s*with (minor|concentration|specialization|focus|honors|track|emphasis)[^\n]*/i, '') // Remove minor info
    .replace(/^(degree|education):\s*/i, '')
    .trim();
  
  return cleanedMajor;
};

/**
 * Extract the latest year from a string that might contain a date range
 * @param {string} yearText - Text that might contain a year or year range
 * @returns {string} - The latest year found, or empty string if no valid year
 */
const extractLatestYear = (yearText) => {
  if (!yearText) return '';
  
  // Replace "Present" or "Current" with the current year
  const currentYear = new Date().getFullYear();
  yearText = yearText.replace(/present|current/i, currentYear.toString());
  
  // Extract all 4-digit years between 1950-2030
  const years = [];
  const yearRegex = /\b(19[5-9][0-9]|20[0-2][0-9]|2030)\b/g;
  let match;
  
  while ((match = yearRegex.exec(yearText)) !== null) {
    years.push(parseInt(match[0], 10));
  }
  
  if (years.length === 0) return '';
  
  // Return the latest year as a string
  return Math.max(...years).toString();
};

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

/**
 * Use Gemini AI to extract resume information
 * @param {string} text - Resume text
 * @returns {Promise<object>} - Extracted resume data
 */
const parseResumeWithGemini = async (text) => {
  // Initialize Gemini API with key from environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in environment variables');
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,  // Lower temperature for more deterministic output
        maxOutputTokens: 1024,
        topP: 0.8,
        topK: 40,
      },
    });
    
    // Truncate text if too long (Gemini has context limits)
    const truncatedText = text.length > 25000 ? text.substring(0, 25000) : text;
    
    // Create detailed prompt for Gemini with more specific instructions
    const prompt = `
    Extract ONLY the following information from this resume text with extremely high precision:
    
    1. NAME:
       - Extract the person's full name (typically at the top of the resume in large font)
       - Include first name and last name, with any middle name/initial
       - The name should be in the format "FirstName LastName" with proper spacing
       - The name is almost always the most prominent text at the top of the resume
       - Examples: "John Smith", "Jane M. Doe", "Robert Johnson"
    
    2. MAJOR:
       - Extract ONLY the specific field of study WITHOUT any degree information
       - DO NOT include "Bachelor of", "Master of", "B.S. in", etc.
       - Examples:
         - From "Bachelor of Science in Computer Science" extract ONLY "Computer Science"
         - From "B.S. in Electrical Engineering" extract ONLY "Electrical Engineering"
         - From "Master's in Business Administration" extract ONLY "Business Administration"
       - If there are multiple majors, choose the primary/most recent one
       - DO NOT include minors, concentrations, or specializations
       - Look in the Education section for this information
    
    3. GRADUATION YEAR:
       - Extract the LATEST/MOST RECENT graduation year (must be a 4-digit year between 1950-2030)
       - Look for phrases like "Expected Graduation: 2025", "Class of 2024", "Graduated: 2023"
       - If you see date ranges like "2020-2024" or "Aug 2021 - May 2025", ALWAYS choose the LATER year (2024, 2025)
       - For "Present" or "Current", use the current year (2024)
       - When multiple graduation years exist, ALWAYS use the most recent/latest one
       - The year must be a valid 4-digit number (e.g., "2023", "2025")
       - If no valid graduation year is found, leave this field empty
       - ONLY include the 4-digit year, not any months or other text
    
    4. COMPANIES:
       - Extract ALL company names from work experience/employment history
       - Look for sections labeled "Experience", "Work Experience", "Employment"
       - Companies should be names only - NO locations, titles, or dates
       - Format company names with proper capitalization (first letter of each word capitalized)
       - Example capitalization: "Microsoft Corporation", "Apple Inc.", "Amazon Web Services"
       - DO NOT use all-caps for company names unless they are acronyms like "IBM" or "NASA"
       - INCLUDE ALL companies listed in work experience
       - Examples:
         - From "Microsoft, Seattle, WA" extract ONLY "Microsoft"
         - From "Apple Inc. (Cupertino, CA)" extract ONLY "Apple Inc."
         - From "Amazon | Software Engineer" extract ONLY "Amazon"
       - Be thorough - extract ALL companies from ALL work experiences
    
    5. SKILLS:
       - Extract ALL technical skills, programming languages, tools, and technologies
       - Focus on sections labeled "Skills", "Technical Skills", "Technologies"
       - Include ALL individual skills as separate items
       - Examples: "Python", "Java", "React", "Node.js", "AWS", "Docker", "Machine Learning"
       - Include frameworks, libraries, platforms, and methodologies
       - Be thorough - extract ALL skills listed in the resume
    
    Format your response as a valid JSON object with these fields:
    {
      "name": "First Last",
      "major": "Subject Name Only",
      "graduationYear": "YYYY",
      "companies": ["Company1", "Company2", "Company3"],
      "keywords": ["Skill1", "Skill2", "Skill3", "Skill4"]
    }
    
    CRITICAL INSTRUCTIONS:
    1. Return ONLY valid JSON - no additional text, explanations, or markdown
    2. For name, use proper capitalization (first letter uppercase, rest lowercase)
    3. For major, include ONLY the subject name, NO degree information
    4. For graduationYear, include ONLY the LATEST/MOST RECENT 4-digit year, nothing else
    5. For companies and keywords, include ALL that you can find
    6. Ensure companies and keywords are non-empty arrays when possible
    
    Resume text:
    ${truncatedText}
    `;
    
    // Use retry logic with backoff for Gemini API calls
    let response;
    try {
      response = await retryWithBackoff(
        async () => {
          const result = await model.generateContent(prompt);
          return await result.response;
        },
        { maxRetries: 3, initialDelay: 2000, maxDelay: 10000 }
      );
    } catch (apiError) {
      console.error('After retries, Gemini API still failed:', apiError);
      // Return default values in case of persistent errors
      return {
        name: '',
        major: 'Unspecified',
        graduationYear: 'Unspecified',
        companies: [],
        keywords: []
      };
    }
    
    const responseText = response.text();
    
    console.log('Raw Gemini response:', responseText);
    
    // Clean the response text to ensure it's valid JSON
    let jsonStr;
    
    try {
      // Remove markdown code blocks if present
      jsonStr = responseText.replace(/```json|```/g, '').trim();
      
      // Fix common JSON formatting issues
      jsonStr = jsonStr.replace(/(\w+):\s*(?!")/g, '"$1": ');  // Add quotes to keys without them
      jsonStr = jsonStr.replace(/:\s*'([^']*)'/g, ': "$1"');  // Replace single quotes with double quotes
      
      // Ensure the string is a valid JSON object
      if (!jsonStr.startsWith('{')) jsonStr = '{' + jsonStr;
      if (!jsonStr.endsWith('}')) jsonStr = jsonStr + '}';
      
      const parsedResponse = JSON.parse(jsonStr);
      console.log('Parsed response:', parsedResponse);
      
      // Process the extracted data
      const formattedName = formatName(parsedResponse.name || '');
      
      // Clean the major to remove degree information
      const cleanedMajor = cleanMajor(parsedResponse.major || '');
      
      // Validate and clean graduation year
      let graduationYear = parsedResponse.graduationYear || '';
      if (graduationYear) {
        // Extract the latest year if the field contains a range
        graduationYear = extractLatestYear(graduationYear);
        
        // Validate it's a 4-digit number between 1950-2030
        if (!/^\d{4}$/.test(graduationYear) || 
            parseInt(graduationYear) < 1950 || 
            parseInt(graduationYear) > 2030) {
          graduationYear = '';
        }
      }
      
      // Ensure companies and keywords are arrays
      const companies = Array.isArray(parsedResponse.companies) 
        ? parsedResponse.companies
            .filter(Boolean)
            .map(company => formatTitleCase(company))
        : [];
      
      const keywords = Array.isArray(parsedResponse.keywords) 
        ? parsedResponse.keywords.filter(Boolean) 
        : [];
      
      console.log('Processed data:', {
        name: formattedName,
        major: cleanedMajor,
        graduationYear,
        companies,
        keywords
      });
      
      return {
        name: formattedName,
        major: cleanedMajor,
        graduationYear,
        companies,
        keywords
      };
    } catch (jsonError) {
      console.error('Error parsing JSON from Gemini response:', jsonError);
      console.error('Raw response:', responseText);
      
      // Try to extract data with regex as fallback
      const nameMatch = responseText.match(/"name"\s*:\s*"([^"]+)"/);
      const majorMatch = responseText.match(/"major"\s*:\s*"([^"]+)"/);
      const yearMatch = responseText.match(/"graduationYear"\s*:\s*"([^"]+)"/);
      
      let extractedName = nameMatch ? nameMatch[1] : '';
      extractedName = formatName(extractedName);
      
      let extractedMajor = majorMatch ? majorMatch[1] : '';
      extractedMajor = cleanMajor(extractedMajor);
      
      let extractedYear = yearMatch ? yearMatch[1].replace(/[^0-9]/g, '') : '';
      extractedYear = extractLatestYear(extractedYear);
      if (!/^\d{4}$/.test(extractedYear) || 
          parseInt(extractedYear) < 1950 || 
          parseInt(extractedYear) > 2030) {
        extractedYear = '';
      }
      
      // Try to extract arrays with regex
      let companies = [];
      let keywords = [];
      
      try {
        const companiesMatch = responseText.match(/"companies"\s*:\s*\[(.*?)\]/s);
        if (companiesMatch && companiesMatch[1]) {
          companies = companiesMatch[1]
            .split(',')
            .map(item => item.trim().replace(/^"|"$/g, ''))
            .filter(Boolean)
            .map(company => formatTitleCase(company));
        }
        
        const keywordsMatch = responseText.match(/"keywords"\s*:\s*\[(.*?)\]/s);
        if (keywordsMatch && keywordsMatch[1]) {
          keywords = keywordsMatch[1]
            .split(',')
            .map(item => item.trim().replace(/^"|"$/g, ''))
            .filter(Boolean);
        }
      } catch (regexError) {
        console.error('Error extracting arrays with regex:', regexError);
      }
      
      return {
        name: extractedName,
        major: extractedMajor,
        graduationYear: extractedYear,
        companies,
        keywords
      };
    }
  } catch (error) {
    console.error('Error parsing resume with Gemini:', error);
    
    // Return empty data rather than failing completely
    return {
      name: '',
      major: 'Unspecified',
      graduationYear: 'Unspecified',
      companies: [],
      keywords: []
    };
  }
};

/**
 * Parse a resume file to extract structured information
 * @param {Buffer} fileBuffer - The resume file buffer
 * @param {string} name - The name of the person (to help with parsing)
 * @returns {Promise<object>} - Structured resume data
 */
const parseResume = async (fileBuffer, name) => {
  try {
    // Check if buffer is valid
    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('Empty file buffer provided');
      return {
        name: name || 'Unknown',
        major: 'Unspecified',
        graduationYear: 'Unspecified',
        companies: [],
        keywords: []
      };
    }
    
    // Extract text from PDF
    const text = await extractTextFromPdf(fileBuffer);
    
    // If text extraction returned error message (our fallback), create default response
    if (text.startsWith('Unable to parse PDF content:')) {
      console.warn('Using fallback data due to PDF parsing error');
      return {
        name: name || 'Unknown',
        major: 'Unspecified',
        graduationYear: 'Unspecified',
        companies: [],
        keywords: []
      };
    }
    
    // Parse with Gemini AI
    const result = await parseResumeWithGemini(text);
    
    // Log the final result for debugging
    console.log('Final resume parsing result:', result);
    
    return result;
  } catch (error) {
    console.error('Error parsing resume:', error);
    // Return default values rather than throwing error
    return {
      name: name || 'Unknown',
      major: 'Unspecified',
      graduationYear: 'Unspecified',
      companies: [],
      keywords: []
    };
  }
};

module.exports = { parseResume }; 