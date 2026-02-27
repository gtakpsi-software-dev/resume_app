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
