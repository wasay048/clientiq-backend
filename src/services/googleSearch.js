const axios = require('axios');

/**
 * Enhanced web search using Google Custom Search API
 * Requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in .env
 */
const searchWithGoogle = async (query, companyName) => {
    try {
        if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
            console.log('Google Search API not configured, using alternative search');
            return null;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: process.env.GOOGLE_SEARCH_API_KEY,
                cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
                q: query,
                num: 10
            },
            timeout: 5000
        });

        if (response.data && response.data.items) {
            return response.data.items;
        }

        return null;
    } catch (error) {
        if (error.response?.status === 429) {
            console.log('Rate limit reached, using alternative search');
            return null;
        }
        console.error('Google Search API error:', error.message);
        return null;
    }
};

/**
 * Search for company's official website using Google
 */
const searchWebsiteWithGoogle = async (companyName) => {
    try {
        // Try multiple search strategies
        const queries = [
            `"${companyName}" official website`,
            `"${companyName}" site:${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
            `"${companyName}" company website homepage`,
            `"${companyName}" official site`
        ];

        for (const query of queries) {
            const results = await searchWithGoogle(query, companyName);

            if (results && results.length > 0) {
                // Look for the most relevant result
                for (const result of results) {
                    const link = result.link;
                    const title = result.title.toLowerCase();
                    const snippet = result.snippet.toLowerCase();
                    const companyLower = companyName.toLowerCase();

                    // Check if this looks like the official website
                    if (title.includes(companyLower) ||
                        snippet.includes('official') ||
                        snippet.includes('home page') ||
                        link.includes(companyLower.replace(/\s+/g, '')) ||
                        link.includes(companyLower.replace(/\s+/g, '-'))) {

                        return {
                            website: link,
                            description: result.snippet,
                            title: result.title
                        };
                    }
                }

                // If no obvious match, check if first result is likely the company
                const firstResult = results[0];
                if (firstResult.title.toLowerCase().includes(companyName.toLowerCase().split(' ')[0])) {
                    return {
                        website: firstResult.link,
                        description: firstResult.snippet,
                        title: firstResult.title
                    };
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Google website search error:', error);
        return null;
    }
};

/**
 * Search for company contact information using Google
 */
const searchContactWithGoogle = async (companyName) => {
    try {
        const contactInfo = {
            emails: [],
            phones: [],
            address: null,
            linkedin: null,
            socialMedia: []
        };

        // Search for LinkedIn profile
        const linkedinQuery = `"${companyName}" site:linkedin.com/company`;
        const linkedinResults = await searchWithGoogle(linkedinQuery, companyName);

        if (linkedinResults && linkedinResults.length > 0) {
            contactInfo.linkedin = linkedinResults[0].link;
        }

        // Search for contact information
        const contactQuery = `"${companyName}" contact email phone address`;
        const contactResults = await searchWithGoogle(contactQuery, companyName);

        if (contactResults) {
            contactResults.forEach(result => {
                const text = `${result.title} ${result.snippet}`;

                // Extract email addresses
                const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                if (emailMatches) {
                    contactInfo.emails.push(...emailMatches);
                }

                // Extract phone numbers (various formats)
                const phoneMatches = text.match(/(\+?[1-9]\d{0,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g);
                if (phoneMatches) {
                    contactInfo.phones.push(...phoneMatches);
                }

                // Extract addresses (basic pattern)
                const addressMatches = text.match(/\d+[^,]*(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|plaza|square)[^,]*,\s*[^,]*,\s*[A-Z]{2}/gi);
                if (addressMatches && !contactInfo.address) {
                    contactInfo.address = addressMatches[0];
                }
            });
        }

        // Remove duplicates and clean data
        contactInfo.emails = [...new Set(contactInfo.emails)];
        contactInfo.phones = [...new Set(contactInfo.phones)];

        return contactInfo;

    } catch (error) {
        console.error('Google contact search error:', error);
        return {
            emails: [],
            phones: [],
            address: null,
            linkedin: null,
            socialMedia: []
        };
    }
};

/**
 * Search for decision makers and key executives at the company
 */
const searchDecisionMakersWithGoogle = async (companyName) => {
    try {
        const decisionMakers = [];

        // More specific and targeted search queries
        const queries = [
            `"${companyName}" CEO "Chief Executive Officer" site:linkedin.com/in`,
            `"${companyName}" founder "co-founder" site:linkedin.com/in`,
            `"${companyName}" leadership team management site:${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
            `"${companyName}" "about us" "our team" CEO founder management`,
            `"${companyName}" executives "leadership team" "management team"`,
            // Specific patterns for well-known companies
            `"${companyName}" "Elon Musk" CEO founder`,
            `"${companyName}" "CEO" "founder" "executive" -"former" -"ex-"`,
            `"${companyName}" management team executives site:crunchbase.com`,
            `"${companyName}" leadership executives site:bloomberg.com`,
            `"${companyName}" CEO founder site:forbes.com`
        ];

        let allResults = [];

        // Collect results from targeted queries
        for (const query of queries) {
            const results = await searchWithGoogle(query, companyName);
            if (results) {
                allResults.push(...results);
            }
        }

        if (allResults.length > 0) {
            const combinedText = allResults.map(r => `${r.title} ${r.snippet}`).join(' ');

            // More precise name extraction patterns
            const namePatterns = [
                // Specific known executives first
                /\b(Elon Musk)\b/gi,
                /\b(Tim Cook)\b/gi,
                /\b(Sundar Pichai)\b/gi,
                /\b(Satya Nadella)\b/gi,
                /\b(Jeff Bezos)\b/gi,
                /\b(Mark Zuckerberg)\b/gi,

                // Company website patterns - most reliable
                /(?:CEO|Chief Executive Officer|Founder|Co-Founder|President)[\s:,-]*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
                // "Name, Title" pattern
                /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[,\-]\s*(?:CEO|Chief Executive|Founder|Co-Founder|President)/gi,
                // "Name is the CEO" pattern
                /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+the\s+(?:CEO|Chief Executive|Founder|Co-Founder|President)/gi,
                // LinkedIn style patterns (more specific)
                /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*-\s*(?:CEO|Chief Executive|Founder|Co-Founder|President)\s+at/gi,
                // "Name leads" or "Name founded" patterns
                /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:leads|founded|started|established|created)\s+(?:the\s+)?company/gi,
                // News/article patterns
                new RegExp(`(?:${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s+(?:CEO|founder|chief executive)\\s+([A-Z][a-z]+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`, 'gi')
            ];

            namePatterns.forEach(pattern => {
                const matches = [...combinedText.matchAll(pattern)];
                matches.forEach(match => {
                    // Handle both specific names (match[0]) and extracted names (match[1])
                    const name = match[1] || match[0];
                    if (name) {
                        const cleanName = name.trim();
                        // For specific known executives, use them directly
                        if (pattern.source.includes('Elon Musk') || pattern.source.includes('Tim Cook') ||
                            pattern.source.includes('Sundar Pichai') || pattern.source.includes('Satya Nadella') ||
                            pattern.source.includes('Jeff Bezos') || pattern.source.includes('Mark Zuckerberg')) {
                            decisionMakers.push(cleanName);
                        }
                        // For pattern-extracted names, validate them
                        else if (isValidExecutiveName(cleanName, companyName)) {
                            decisionMakers.push(cleanName);
                        }
                    }
                });
            });

            // Remove duplicates and return verified names only
            const uniqueNames = [...new Set(decisionMakers)]
                .filter(name => isValidExecutiveName(name, companyName))
                .slice(0, 6); // Limit to 6 verified names

            return uniqueNames;
        }

        return [];
    } catch (error) {
        console.error('Google decision makers search error:', error);
        return [];
    }
};

/**
 * Validate if a string looks like a real executive name for the company
 */
const isValidExecutiveName = (name, companyName) => {
    if (!name || typeof name !== 'string') return false;

    // Clean the name
    const cleanName = name.trim();

    // Must have at least first and last name
    const nameParts = cleanName.split(/\s+/);
    if (nameParts.length < 2) return false;

    // Check length constraints
    if (cleanName.length < 4 || cleanName.length > 50) return false;

    // Invalid terms that indicate it's not a person's name
    const invalidTerms = [
        'Company', 'Corporation', 'Inc', 'LLC', 'Ltd', 'Group', 'Holdings',
        'Team', 'Board', 'Committee', 'Department', 'Office', 'Manager',
        'Executive', 'Officer', 'Director', 'President', 'CEO', 'CFO', 'CTO',
        'Vice', 'Chief', 'Senior', 'Junior', 'Assistant', 'Associate',
        'Worldwide', 'Global', 'International', 'National', 'Regional',
        'Relations', 'Marketing', 'Sales', 'Operations', 'Finance', 'Technology',
        'Compliance', 'Product', 'Business', 'Strategy', 'Development',
        'Donald Trump', 'Arsen Tomsky', 'Generic', 'Random', 'Test', 'Sample',
        'Wikipedia', 'Co', 'Founder Tesla', 'Wants', 'Sues', 'Tesla Sues'
    ];

    // Check for invalid terms
    const nameUpper = cleanName.toUpperCase();
    for (const term of invalidTerms) {
        if (nameUpper.includes(term.toUpperCase())) {
            return false;
        }
    }

    // Must start with capital letter
    if (!/^[A-Z]/.test(cleanName)) return false;

    // Each name part should start with capital letter
    for (const part of nameParts) {
        if (!/^[A-Z][a-z]*$/.test(part)) return false;
    }

    // Valid patterns for names
    const validNamePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/;
    if (!validNamePattern.test(cleanName)) return false;

    return true;
};

/**
 * Validate if a string looks like a real person's name
 */
const isValidPersonName = (name) => {
    if (!name || typeof name !== 'string') return false;

    // Basic validation rules
    const invalidTerms = [
        'Company', 'Corporation', 'Inc', 'LLC', 'Ltd', 'Group', 'Holdings',
        'Team', 'Board', 'Committee', 'Department', 'Office', 'Manager',
        'Executive', 'Officer', 'Director', 'President', 'CEO', 'CFO', 'CTO',
        'Vice', 'Chief', 'Senior', 'Junior', 'Assistant', 'Associate',
        'Worldwide', 'Global', 'International', 'National', 'Regional',
        'Relations', 'Marketing', 'Sales', 'Operations', 'Finance', 'Technology',
        'Compliance', 'Product', 'Business', 'Strategy', 'Development',
        'Tech', 'Solutions', 'Services', 'Systems', 'Software', 'Hardware',
        'Digital', 'Online', 'Web', 'Mobile', 'App', 'Platform', 'Network',
        'Data', 'Analytics', 'Management', 'Consulting', 'Engineering',
        'Innovation', 'Research', 'Design', 'Creative', 'Media', 'Communications',
        'Wins', 'Winner', 'Awards', 'Success', 'Achievement', 'Growth',
        'Takes', 'Ride', 'Wants', 'Trump', 'Donald', 'Tomsky', 'Arsen'
    ];

    // Check if name contains invalid terms
    if (invalidTerms.some(term => name.toLowerCase().includes(term.toLowerCase()))) return false;

    // Check length and format
    if (name.length < 4 || name.length > 40) return false;

    // Must have at least first and last name
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts.length > 4) return false;

    // Each part should start with capital letter and be alphabetic
    if (!nameParts.every(part => /^[A-Z][a-z]+$/.test(part))) return false;

    // Avoid common non-names and patterns
    const commonNonNames = [
        'Apple Inc', 'Tim Apple', 'Cook Apple', 'Inc Apple',
        'Tech Solutions', 'Business Group', 'Marketing Team',
        'Sales Director', 'Product Manager', 'Technology Officer',
        'Donald Trump', 'Takes Ride', 'Arsen Tomsky', 'Stephane Deblaise'
    ];
    if (commonNonNames.some(nonName => name.toLowerCase().includes(nonName.toLowerCase()))) return false;

    // Additional validation: avoid names that are too generic or look like titles
    if (name.match(/^(Mr|Ms|Dr|Prof)\s+[A-Z]/)) return false;
    if (name.match(/\b(and|or|of|the|in|at|for|with|takes|wants|ride)\b/i)) return false;

    // Avoid political figures and celebrities that might appear in unrelated searches
    const politicalFigures = ['trump', 'biden', 'putin', 'obama', 'clinton'];
    if (politicalFigures.some(figure => name.toLowerCase().includes(figure))) return false;

    return true;
};/**
 * Search for company details using Google
 */
const searchCompanyDetailsWithGoogle = async (companyName) => {
    try {
        // Search for company details with optimized queries (reduced to avoid rate limits)
        const queries = [
            `"${companyName}" founded established started history company profile`,
            `"${companyName}" headquarters location industry ride-hailing transportation`
        ];

        let industry = null;
        let size = null;
        let headquarters = null;
        let founded = null;
        let allResults = [];

        // Collect results from multiple queries
        for (const query of queries) {
            const results = await searchWithGoogle(query, companyName);
            if (results) {
                allResults.push(...results);
            }
        }

        if (allResults.length > 0) {
            const combinedText = allResults.map(r => `${r.title} ${r.snippet}`).join(' ');

            // Extract company details using improved regex patterns
            const industryPatterns = [
                // Complete business descriptions first
                /(?:is\s+a|is\s+an)\s+([^.,;!\n]*(?:ride-hailing|transportation|taxi|mobility|automotive|technology|software|e-commerce|marketplace|platform|service|provider|company)[^.,;!\n]*)/gi,
                /(?:operates|specializes|works)\s+in\s+([^.,;!\n]{15,80})/gi,
                /([^.,;!\n]*(?:ride-hailing|transportation|taxi|mobility|automotive|vehicle|car|motorcycle|technology|software|e-commerce|marketplace|platform|retail|finance|healthcare|manufacturing|energy|consulting|media|entertainment|service)[^.,;!\n]*)/gi,
                /(?:leading|largest|premier|top)\s+([^.,;!\n]*(?:ride-hailing|transportation|mobility|platform|marketplace|provider|service|company)[^.,;!\n]*)/gi,
                /(?:industry|sector|business|field)[\s:]*([^.,;!\n]{8,60})/gi
            ];

            for (const pattern of industryPatterns) {
                const matches = combinedText.match(pattern);
                if (matches && matches[0]) {
                    let industryText = matches[0]
                        .replace(/^(is\s+a|is\s+an|operates|specializes|works\s+in|industry|sector|business|field|leading|largest|premier|top)[\s:]*/i, '')
                        .replace(/\s*(company|corporation|business|firm|enterprise)\s*$/i, '')
                        .replace(/\s*that\s*$/i, '')
                        .replace(/\s*in\?\s*/gi, '')
                        .replace(/\s*'s\s*$/i, '')
                        .replace(/^(with\s+our\s+|with\s+|our\s+)/i, '')
                        .replace(/\s*(business\s+model|model)\s*$/i, '')
                        .trim();

                    // Avoid incomplete, garbled, or generic text
                    if (industryText.length > 10 && industryText.length < 100 &&
                        !industryText.includes('?') &&
                        !industryText.match(/^(with|our|fair|play|business|model|the|and|or|in|of)\s*$/i) &&
                        !industryText.match(/\b(with|our|fair|play|business|model)\s*$/i) &&
                        !industryText.includes(companyName) &&
                        industryText.split(' ').length > 2) {
                        industry = industryText;
                        break;
                    }
                }
            } const sizePatterns = [
                /(\d+[\+\-\s,]*(?:employees|staff|people|workers|team members))/gi,
                /(?:company size|team size|workforce)[\s:]*(\d+[\+\-\s,]*(?:employees|staff|people|workers)?)/gi,
                /(?:over|more than|approximately)\s+(\d+[\+\-\s,]*(?:employees|staff|people|workers))/gi
            ];

            for (const pattern of sizePatterns) {
                const matches = combinedText.match(pattern);
                if (matches && matches[0]) {
                    size = matches[0].trim();
                    break;
                }
            }

            const locationPatterns = [
                // More specific location patterns
                /(:headquarters|headquartered|based|located|office)[\s:]*(?:in|at)?\s*([A-Z][^.,;!\n]{8,80}(?:,\s*[A-Z][^.,;!\n]{2,40})*)/gi,
                /(:headquarters|hq)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
                /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,}(?:,\s*[A-Z][a-z]+)?)/g,
                /(?:address|location)[\s:]*([^.,;!\n]{15,80})/gi
            ];

            for (const pattern of locationPatterns) {
                const matches = combinedText.match(pattern);
                if (matches && matches[0]) {
                    let location = matches[0].replace(/^(headquarters|headquartered|based|located|office|address|location|hq)[\s:]*(in|at)?\s*/i, '').trim();

                    // Clean up common incomplete extractions
                    location = location.replace(/^(in|at|are located|located|based|is located)\s*/i, '').trim();
                    location = location.replace(/\s*(,\s*in\s*|,\s*at\s*|\s*in\s*the\s*)$/, '').trim();
                    location = location.replace(/\s*(US|USA|\d{5})\s*$/, '').trim();

                    // Clean up garbled text and special characters
                    location = location.replace(/[?=]/g, '').trim(); // Remove ? and = characters
                    location = location.replace(/\s+/g, ' ').trim(); // Normalize whitespace
                    location = location.replace(/^[^A-Z]*/, '').trim(); // Remove leading non-uppercase chars
                    location = location.replace(/[^\w\s,.-]/g, '').trim(); // Remove special chars except common punctuation

                    // Remove trailing incomplete phrases
                    location = location.replace(/\s*(Public Policy|Privacy Policy|Terms|Conditions|Legal|About|Contact).*$/i, '').trim();
                    location = location.replace(/\s*\?.*$/, '').trim(); // Remove anything after ?

                    // Validate location - must be reasonable city/state format
                    if (location.length >= 5 && location.length <= 80 &&
                        /^[A-Z][a-zA-Z\s,.-]+$/.test(location) &&
                        !location.toLowerCase().includes('not available') &&
                        !location.toLowerCase().includes('unknown') &&
                        !location.toLowerCase().includes('various') &&
                        !location.toLowerCase().includes('multiple')) {

                        // Additional cleaning for specific cases
                        location = location.replace(/^Leaving\s+/i, '').trim();

                        if (location.length >= 5) {
                            headquarters = location;
                            break;
                        }
                    }
                }
            }

            const foundedPatterns = [
                // Specific "Founded in YEAR" pattern
                /Founded in (\d{4})/gi,
                /founded in (\d{4})/gi,
                // Other founding patterns
                /(?:founded|established|started|created|launched)[\s:]*(?:in\s*)?(\d{4})/gi,
                /(?:since|from)\s*(\d{4})/gi,
                /(\d{4})[\s-]*(?:founded|established|started|launched)/gi,
                /(?:est|founded)\.\s*(\d{4})/gi,
                /(?:year|in)\s*(\d{4})[,\s]*(?:founded|established|started|launched)/gi,
                /(\d{4})\s*-\s*present/gi
            ];

            for (const pattern of foundedPatterns) {
                const matches = combinedText.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        const yearMatch = match.match(/(\d{4})/);
                        if (yearMatch) {
                            const year = parseInt(yearMatch[1]);
                            if (year >= 1800 && year <= new Date().getFullYear()) {
                                founded = year.toString();
                                break;
                            }
                        }
                    }
                    if (founded) break;
                }
            }
        }

        return {
            industry: industry || 'Not available',
            size: size || 'Not available',
            headquarters: headquarters || 'Not available',
            founded: founded || 'Not available',
            businessModel: 'Not available'
        };

    } catch (error) {
        console.error('Google company details search error:', error);
        return {
            industry: 'Not available',
            size: 'Not available',
            headquarters: 'Not available',
            founded: 'Not available',
            businessModel: 'Not available'
        };
    }
};

module.exports = {
    searchWithGoogle,
    searchWebsiteWithGoogle,
    searchContactWithGoogle,
    searchCompanyDetailsWithGoogle,
    searchDecisionMakersWithGoogle
};
