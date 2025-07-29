const axios = require('axios');
const {
    searchWebsiteWithGoogle,
    searchContactWithGoogle,
    searchCompanyDetailsWithGoogle,
    searchDecisionMakersWithGoogle
} = require('./googleSearch');

/**
 * Search for company information using real-time web search
 * @param {string} companyName - Name of the company to search
 * @returns {Object} Search results with real contact info
 */
const searchCompanyInfo = async (companyName) => {
    try {
        console.log(`🔍 Starting real-time search for: ${companyName}`);

        // Try Google Search first (if configured), then fallback to DuckDuckGo
        let websiteResults, contactResults, companyDetails, decisionMakersResults;

        // Try Google Search API first
        try {
            console.log(`📊 Attempting Google search for ${companyName}...`);
            websiteResults = await searchWebsiteWithGoogle(companyName);
            contactResults = await searchContactWithGoogle(companyName);
            companyDetails = await searchCompanyDetailsWithGoogle(companyName);
            decisionMakersResults = await searchDecisionMakersWithGoogle(companyName);

            if (websiteResults || contactResults || companyDetails || decisionMakersResults) {
                console.log(`✅ Google search successful for ${companyName}`);
            }
        } catch (googleError) {
            console.log(`⚠️ Google search failed, falling back to DuckDuckGo: ${googleError.message}`);
        }

        // Fallback to DuckDuckGo if Google didn't work or isn't configured
        if (!websiteResults) {
            console.log(`🦆 Using DuckDuckGo search for ${companyName}...`);
            websiteResults = await searchForWebsite(companyName);
        }

        if (!contactResults) {
            contactResults = await searchForContactInfo(companyName, websiteResults?.website);
        }

        if (!companyDetails) {
            companyDetails = await searchForCompanyDetails(companyName);
        }

        const result = {
            website: websiteResults?.website || null,
            description: websiteResults?.description || null,
            decisionMakers: decisionMakersResults || [],
            contactInfo: contactResults,
            companyDetails: companyDetails,
            searchTimestamp: new Date().toISOString(),
            searchMethod: websiteResults?.website ? 'Google + DuckDuckGo' : 'DuckDuckGo'
        };

        console.log(`✅ Search completed for ${companyName}:`, {
            hasWebsite: !!result.website,
            hasEmails: result.contactInfo?.emails?.length > 0,
            hasPhones: result.contactInfo?.phones?.length > 0,
            hasLinkedIn: !!result.contactInfo?.linkedin,
            hasDecisionMakers: result.decisionMakers?.length > 0,
            method: result.searchMethod
        });

        return result;

    } catch (error) {
        console.error(`❌ Web search error for ${companyName}:`, error);
        return {
            website: null,
            description: null,
            contactInfo: null,
            companyDetails: null,
            error: error.message,
            searchTimestamp: new Date().toISOString()
        };
    }
};/**
 * Search for company's official website
 */
const searchForWebsite = async (companyName) => {
    try {
        // Using Google Custom Search API or similar service
        // For demo, using DuckDuckGo instant answer API (free)
        const searchQuery = `${companyName} official website`;
        const response = await axios.get(`https://api.duckduckgo.com/`, {
            params: {
                q: searchQuery,
                format: 'json',
                no_html: '1',
                skip_disambig: '1'
            },
            timeout: 5000
        });

        let website = null;
        let description = null;

        // Extract website from DuckDuckGo response
        if (response.data && response.data.AbstractURL) {
            website = response.data.AbstractURL;
            description = response.data.Abstract;
        } else if (response.data && response.data.Results && response.data.Results.length > 0) {
            website = response.data.Results[0].FirstURL;
            description = response.data.Results[0].Text;
        }

        // Clean and validate the website URL
        if (website) {
            website = cleanWebsiteURL(website);
        }

        return { website, description };

    } catch (error) {
        console.error('Website search error:', error);
        return { website: null, description: null };
    }
};

/**
 * Search for company contact information
 */
const searchForContactInfo = async (companyName, website) => {
    try {
        const contactInfo = {
            emails: [],
            phones: [],
            address: null,
            linkedin: null,
            socialMedia: []
        };

        // Search for LinkedIn profile
        const linkedinQuery = `${companyName} site:linkedin.com/company`;
        const linkedinResponse = await axios.get(`https://api.duckduckgo.com/`, {
            params: {
                q: linkedinQuery,
                format: 'json',
                no_html: '1'
            },
            timeout: 5000
        });

        if (linkedinResponse.data && linkedinResponse.data.Results) {
            const linkedinResult = linkedinResponse.data.Results.find(result =>
                result.FirstURL && result.FirstURL.includes('linkedin.com/company')
            );
            if (linkedinResult) {
                contactInfo.linkedin = linkedinResult.FirstURL;
            }
        }

        // Search for contact information
        const contactQuery = `${companyName} contact phone email address`;
        const contactResponse = await axios.get(`https://api.duckduckgo.com/`, {
            params: {
                q: contactQuery,
                format: 'json',
                no_html: '1'
            },
            timeout: 5000
        });

        // Extract contact info from search results
        if (contactResponse.data && contactResponse.data.Results) {
            contactResponse.data.Results.forEach(result => {
                const text = result.Text || '';

                // Extract email addresses
                const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                if (emailMatches) {
                    contactInfo.emails.push(...emailMatches);
                }

                // Extract phone numbers
                const phoneMatches = text.match(/[\+]?[1-9]?[\-\.\s]?\(?[0-9]{3}\)?[\-\.\s]?[0-9]{3}[\-\.\s]?[0-9]{4}/g);
                if (phoneMatches) {
                    contactInfo.phones.push(...phoneMatches);
                }
            });
        }

        // Remove duplicates
        contactInfo.emails = [...new Set(contactInfo.emails)];
        contactInfo.phones = [...new Set(contactInfo.phones)];

        return contactInfo;

    } catch (error) {
        console.error('Contact search error:', error);
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
 * Search for company details like industry, size, location
 */
const searchForCompanyDetails = async (companyName) => {
    try {
        const detailsQuery = `${companyName} company industry employees headquarters location`;
        const response = await axios.get(`https://api.duckduckgo.com/`, {
            params: {
                q: detailsQuery,
                format: 'json',
                no_html: '1'
            },
            timeout: 5000
        });

        let industry = null;
        let size = null;
        let headquarters = null;
        let founded = null;

        if (response.data && response.data.Abstract) {
            const text = response.data.Abstract;

            // Extract company details using regex patterns
            const industryMatch = text.match(/(?:industry|sector|business):\s*([^.,]+)/i);
            if (industryMatch) industry = industryMatch[1].trim();

            const sizeMatch = text.match(/(\d+[\+\-\s]*(?:employees|staff|people))/i);
            if (sizeMatch) size = sizeMatch[1].trim();

            const locationMatch = text.match(/(?:headquarters|based|located)(?:\s+in)?\s*([^.,]+)/i);
            if (locationMatch) headquarters = locationMatch[1].trim();

            const foundedMatch = text.match(/(?:founded|established)(?:\s+in)?\s*(\d{4})/i);
            if (foundedMatch) founded = foundedMatch[1];
        }

        return {
            industry: industry || 'Not available',
            size: size || 'Not available',
            headquarters: headquarters || 'Not available',
            founded: founded || 'Not available',
            businessModel: 'Not available'
        };

    } catch (error) {
        console.error('Company details search error:', error);
        return {
            industry: 'Not available',
            size: 'Not available',
            headquarters: 'Not available',
            founded: 'Not available',
            businessModel: 'Not available'
        };
    }
};

/**
 * Clean and validate website URL
 */
const cleanWebsiteURL = (url) => {
    if (!url) return null;

    // Remove tracking parameters and clean URL
    try {
        const cleanUrl = url.split('?')[0]; // Remove query parameters

        // Validate URL format
        const urlPattern = /^https?:\/\/([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
        if (urlPattern.test(cleanUrl)) {
            return cleanUrl;
        }

        // If it doesn't start with http/https, add https
        if (!cleanUrl.startsWith('http')) {
            return `https://${cleanUrl}`;
        }

        return cleanUrl;
    } catch (error) {
        return null;
    }
};

/**
 * Alternative search using Bing Search API (requires API key)
 * Uncomment and configure if you have Bing Search API key
 */
/*
const searchWithBing = async (query) => {
    try {
        const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_API_KEY
            },
            params: {
                q: query,
                count: 10,
                responseFilter: 'Webpages'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Bing search error:', error);
        return null;
    }
};
*/

module.exports = {
    searchCompanyInfo,
    searchForWebsite,
    searchForContactInfo,
    searchForCompanyDetails
};
