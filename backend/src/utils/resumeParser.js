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
  
  // 1. Create a dictionary of exact brand spellings
  const exactBrandNames = {
    'nvidia': 'NVIDIA',
    'pwc': 'PwC',
    'ibm': 'IBM',
    'aws': 'AWS',
    'hp': 'HP',
    'ge': 'GE',
    'nasa': 'NASA',
    'gt': 'GT',
    'llc': 'LLC',
    'inc': 'Inc',
    'corp': 'Corp',
    'github': 'GitHub',
    'vmware': 'VMware'
  };

  const commonLowercase = ['of', 'the', 'and', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'to'];
  
  return text.split(' ')
    .map((word, index) => {
      const lowerWord = word.toLowerCase();
      
      // 2. Check the dictionary first
      if (exactBrandNames[lowerWord]) {
        return exactBrandNames[lowerWord];
      }
      
      // 3. Keep small words lowercase
      if (index > 0 && commonLowercase.includes(lowerWord)) {
        return lowerWord;
      }
      
      // 4. Default Title Case
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
        responseMimeType: "application/json",
      },
    });
    
    // Truncate text if too long (Gemini has context limits)
    const truncatedText = text.length > 25000 ? text.substring(0, 25000) : text;
    
    // Create detailed prompt for Gemini with more specific instructions
    const prompt = `
    You are an advanced Applicant Tracking System (ATS) expert designed to extract structured data from messy, unstructured PDF text. 
        
    Extract the following fields with absolute precision. Output ONLY a valid JSON object.
    
    1. NAME:
       - Extract the candidate's full name. It is usually the first distinct linguistic entity in the text.
       - Format as Title Case (e.g., "First Last").
    
    2. MAJOR:
       - Identify the candidate's primary field of study.
       - STRICT RULE: Strip all degree classifications (Bachelor of Science, B.S., Master's, Degree in).
       - Examples: If text says "B.S. in Computer Engineering", output "Computer Engineering". 
    
    3. GRADUATION YEAR:
       - Scan the Education section for the latest graduation or expected graduation year.
       - STRICT RULE: Must be a 4-digit number. If a range is present (2024-2028), extract the end year ("2028").
    
    4. COMPANIES (Semantic Extraction):
       - Do not rely on line breaks. Scan the text for organizational entities paired with professional, leadership, or technical titles (e.g., Intern, Engineer, Developer, Founder, Lead, Assistant, Member).
       - Include corporate employers, student project teams, research labs, and startups.
       - NEGATIVE CONSTRAINTS: 
         - Do NOT include locations (e.g., "Atlanta, GA", "Remote").
         - Do NOT include dates or date ranges.
         - Do NOT include the university name unless the role is explicitly an employee position (like "Undergraduate Research Assistant" or "Teaching Assistant").
       - Clean suffixes like ", Inc.", " LLC", or " Corp".
    
    5. KEYWORDS (Skills & Technologies):
       - Extract all technical skills, programming languages, and hardware/software tools.
       - Exclude soft skills (e.g., "Leadership", "Communication").
    
    FEW-SHOT EXAMPLES:
    - Text: "NVIDIA May 2024 - Aug 2024 Santa Clara, CA Developer Tools Software Project Manager Intern"
      Extracted Company: "NVIDIA"
    - Text: "PwC Incoming Cloud & Digital SAP Consulting Intern May 2025 - Aug 2025 Boston, MA"
      Extracted Company: "PwC"
    - Text: "College of Computing at Georgia Institute of Technology Discrete Mathematics Teaching Assistant Aug 2023 - Current Atlanta, GA"
      Extracted Company: "Georgia Institute of Technology"
    - Text: "180 Degrees Consulting Project Manager Jan 2023 - May 2024 Atlanta, GA"
      Extracted Company: "180 Degrees Consulting"
    - Text: "Solar Racing Team Strategy Sub Team Member Aug 2022-Jan 2024 Atlanta, GA"
      Extracted Company: "Solar Racing Team"
    - Text: "Google Software Engineering Intern Mountain View, CA Summer 2023"
      Extracted Company: "Google"

    JSON SCHEMA TO RETURN:
    {
      "name": "First Last",
      "major": "Cleaned Major Name",
      "graduationYear": "YYYY",
      "companies": ["Company 1", "Company 2"],
      "keywords": ["C++", "Java", "FPGA", "ASIC", "React"]
    }
    
    RAW RESUME TEXT:
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