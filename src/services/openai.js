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
            basic: `You are a B2B sales expert. Research the company "${companyName}" and provide comprehensive information in JSON format.

Please analyze and provide the following information about ${companyName}:

1. Company Overview - A detailed description of what the company does
2. Pain Points - 3 key business challenges they likely face
3. Custom Sales Pitch - A tailored B2B sales pitch for your services
4. Decision Makers - Key people involved in purchasing decisions
5. Technologies - Technologies they likely use
6. Contact Information - Website, emails, social media
7. Company Details - Industry, size, location, etc.

Return your response as a valid JSON object with these exact keys:
- companyOverview (string)
- painPoints (array of 3 strings)
- customSalesPitch (string)
- decisionMakers (array of 5 strings)
- technologies (array of 5 strings)
- contactInfo (object with website, emails, phones, linkedin, socialMedia, address)
- companyDetails (object with industry, size, headquarters, founded, businessModel)

Make sure your response is properly formatted JSON.`,

            premium: `You are a senior B2B sales strategist. Conduct an in-depth analysis of "${companyName}" and provide detailed insights in JSON format.

Please provide comprehensive analysis including:

1. Detailed Company Overview - In-depth analysis of business model, market position
2. Pain Points - 5 specific business challenges with context
3. Custom Sales Pitch - Sophisticated, personalized pitch
4. Decision Makers - 7 key stakeholders with their roles
5. Technologies - 8 technologies they use or need
6. Contact Information - Complete contact details
7. Company Details - Detailed company information including revenue estimates
8. Additional Insights - Market trends, competitive landscape, recent developments

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
                    content: 'You are an expert B2B sales researcher. Always respond with valid JSON format containing the requested information about companies.'
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

        const cleanCompanyName = companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
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
            'Director of Operations'
        ].slice(0, userRole === 'premium' ? 7 : 5);

        parsedResults.technologies ||= [
            'CRM Software',
            'ERP Systems',
            'Cloud Platforms (AWS/Azure)',
            'Business Intelligence Tools',
            'Project Management Software'
        ].slice(0, userRole === 'premium' ? 8 : 5);

        parsedResults.contactInfo ||= {
            website: `https://www.${cleanCompanyName}.com`,
            emails: [`info@${cleanCompanyName}.com`, `contact@${cleanCompanyName}.com`, `sales@${cleanCompanyName}.com`],
            phones: ['+1-XXX-XXX-XXXX'],
            linkedin: `https://linkedin.com/company/${cleanCompanyName}`,
            socialMedia: ['LinkedIn', 'Twitter', 'Facebook'],
            address: `${companyName} HQ, Business District, City`
        };

        parsedResults.companyDetails ||= {
            industry: 'Technology',
            size: '100-500 employees',
            headquarters: 'USA',
            founded: '2000s',
            businessModel: 'B2B'
        };

        if (userRole === 'premium') {
            parsedResults.companyDetails.revenue ||= '$10M - $50M';
            parsedResults.companyDetails.recentNews ||= 'Recently expanded into new markets.';
            parsedResults.additionalInsights ||= 'Industry is shifting towards AI and automation. Competitive landscape is tightening.';
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
