const OpenAI = require('openai');


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @param {string} companyName - Name of the company to research
 * @param {string} userRole - User's role (basic/premium) for different prompts
 * @returns {Object} Research results
 */
const generateCompanyResearch = async (companyName, userRole = 'basic') => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        const prompts = {
            basic: `You are a B2B sales expert with access to real company data. Research the REAL company "${companyName}" and provide ACCURATE, VERIFIED information in JSON format.

IMPORTANT: Only provide information that you can reasonably verify or that is publicly available. If you cannot find specific details, use "Not available" rather than making up fake information.

Please analyze and provide the following information about ${companyName}:

1. Company Overview - A detailed description of what the company actually does
2. Pain Points - 3 realistic business challenges they likely face based on their industry
3. Custom Sales Pitch - A tailored B2B sales pitch for your services
4. Decision Makers - Realistic job titles (not specific names)
5. Technologies - Technologies they likely use based on their industry
6. Contact Information - REAL website, realistic email formats, actual LinkedIn if known
7. Company Details - Actual industry, realistic size, real location if known

CRITICAL CONTACT INFO RULES:
- website: Use the company's ACTUAL website if known, otherwise use realistic format
- emails: Use realistic email formats based on actual domain (info@domain.com, contact@domain.com)
- phones: Use realistic phone number format for their region, or "Not available"
- linkedin: Use actual LinkedIn company page if known, otherwise "Not available"
- address: Use actual headquarters location if known, otherwise "Not available"

Return your response as a valid JSON object with these exact keys:
- companyOverview (string)
- painPoints (array of 3 strings)
- customSalesPitch (string)
- decisionMakers (array of 5 strings)
- technologies (array of 5 strings)
- contactInfo (object with website, emails, phones, linkedin, socialMedia, address)
- companyDetails (object with industry, size, headquarters, founded, businessModel)

Make sure your response is properly formatted JSON.`,

            premium: `You are a senior B2B sales strategist with access to comprehensive company databases. Conduct an in-depth analysis of the REAL company "${companyName}" and provide ACCURATE, VERIFIED insights in JSON format.

CRITICAL INSTRUCTION: Only provide information that you can verify or that is publicly available. Use "Not available" for information you cannot confirm rather than generating fake data.

Please provide comprehensive analysis including:

1. Detailed Company Overview - In-depth analysis of actual business model, market position
2. Pain Points - 5 specific business challenges based on their actual industry and size
3. Custom Sales Pitch - Sophisticated, personalized pitch based on real company profile
4. Decision Makers - 7 realistic job titles (not specific names) appropriate for their company size
5. Technologies - 8 technologies they actually use or likely need based on their industry
6. Contact Information - VERIFIED contact details including real website, proper emails, actual LinkedIn
7. Company Details - ACTUAL detailed company information including realistic revenue estimates
8. Additional Insights - Real market trends, competitive landscape, factual recent developments

CONTACT INFORMATION REQUIREMENTS:
- website: Must be the company's ACTUAL website (research their real domain)
- emails: Use proper email formats with their real domain (info@realdomain.com)
- phones: Real phone number format for their country/region, or "Not available"
- linkedin: Actual LinkedIn company page URL if it exists, otherwise "Not available"
- address: Real headquarters address if publicly available, otherwise "Not available"
- socialMedia: Only list platforms they actually use

Return your response as a valid JSON object with these exact keys:
- companyOverview (string)
- painPoints (array of 5 strings)
- customSalesPitch (string)
- decisionMakers (array of 7 strings)
- technologies (array of 8 strings)
- contactInfo (object with website, emails, phones, linkedin, socialMedia, address)
- companyDetails (object with industry, size, headquarters, founded, businessModel, revenue, recentNews)
- additionalInsights (string)

Make sure your response is properly formatted JSON.`
        };

        const prompt = prompts[userRole] || prompts.basic;

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert B2B sales researcher with access to real company data. CRITICAL: Only provide accurate, verifiable information about companies. Use "Not available" for information you cannot verify rather than creating fake details. Focus on providing realistic, industry-appropriate insights based on publicly available information. Always respond with valid JSON format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: userRole === 'premium' ? 2000 : 1200,
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0].message.content;
        const parsedResults = JSON.parse(responseContent);

        // Only add fallback data if the AI didn't provide specific information
        // Avoid creating fake contact details
        if (!parsedResults.contactInfo || Object.keys(parsedResults.contactInfo).length === 0) {
            parsedResults.contactInfo = {
                website: "Not available - Please search online",
                emails: ["Contact information not publicly available"],
                phones: ["Not available"],
                linkedin: "Not available - Search LinkedIn directly",
                socialMedia: ["Information not available"],
                address: "Not available - Check company website"
            };
        } else {
            // Clean up any obviously fake or template data
            if (parsedResults.contactInfo.website && parsedResults.contactInfo.website.includes('${cleanCompanyName}')) {
                parsedResults.contactInfo.website = "Not available - Please search online";
            }
            if (parsedResults.contactInfo.linkedin && parsedResults.contactInfo.linkedin.includes('${cleanCompanyName}')) {
                parsedResults.contactInfo.linkedin = "Not available - Search LinkedIn directly";
            }
        }

        // Add realistic fallbacks for other required fields only if missing
        parsedResults.painPoints ||= [
            'Digital transformation and technology modernization challenges',
            'Operational efficiency and cost optimization needs',
            'Customer acquisition and retention in competitive markets'
        ].slice(0, userRole === 'premium' ? 5 : 3);

        parsedResults.decisionMakers ||= [
            'Chief Executive Officer (CEO)',
            'Chief Technology Officer (CTO)',
            'Chief Financial Officer (CFO)',
            'VP of Sales & Marketing',
            'Director of Operations',
            'Head of Procurement',
            'Chief Operating Officer (COO)'
        ].slice(0, userRole === 'premium' ? 7 : 5);

        parsedResults.technologies ||= [
            'CRM Software',
            'ERP Systems',
            'Cloud Platforms (AWS/Azure)',
            'Business Intelligence Tools',
            'Project Management Software',
            'Email Marketing Platforms',
            'Data Analytics Tools',
            'Cybersecurity Solutions'
        ].slice(0, userRole === 'premium' ? 8 : 5);

        parsedResults.companyDetails ||= {
            industry: 'Industry information not available',
            size: 'Company size not specified',
            headquarters: 'Location not available',
            founded: 'Founded date not available',
            businessModel: 'Business model not specified'
        };

        if (userRole === 'premium') {
            parsedResults.companyDetails.revenue ||= 'Revenue information not publicly available';
            parsedResults.companyDetails.recentNews ||= 'Recent news not available';
            parsedResults.additionalInsights ||= 'Additional market insights require further research with verified data sources.';
        }

        return {
            ...parsedResults,
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            tokensUsed: completion.usage?.total_tokens || 0
        };

    } catch (error) {
        console.error('Error:', error.message || error);
        throw new Error('Failed to generate company research');
    }
};

/**
 * @param {string} companyName - Company name
 * @param {string} originalPitch - Original pitch to revise
 * @param {string} angle - New pitch angle (e.g., "efficiency", "growth")
 * @returns {Object} New pitch object
 */
const generateAlternativePitch = async (companyName, originalPitch, angle = 'efficiency') => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        const prompt = `Based on this original pitch for "${companyName}":
"${originalPitch}"

Create an alternative B2B sales pitch with a focus on "${angle}". 
Make it compelling and different from the original while maintaining professionalism.
Keep it to 2-3 sentences and return the response in JSON format with key "pitch".`;

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a B2B sales expert specializing in creating compelling pitches from different angles. Always respond in JSON format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 400,
            temperature: 0.8,
            response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0].message.content;
        const parsedResponse = JSON.parse(responseContent);

        return {
            pitch: parsedResponse.pitch,
            angle,
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
        };

    } catch (error) {
        console.error('Pitch error:', error.message || error);
        throw new Error('Failed to generate alternative pitch');
    }
};

module.exports = {
    generateCompanyResearch,
    generateAlternativePitch
};
