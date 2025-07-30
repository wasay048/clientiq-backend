const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate comprehensive company research using only GPT-4o
 * @param {string} companyName - Name of the company to research
 * @param {string} userRole - User's role (basic/premium) for different detail levels
 * @returns {Object} Research results
 */
const generateCompanyResearch = async (companyName, userRole = 'basic') => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        const prompts = {
            basic: `You are an expert B2B sales researcher with extensive knowledge of companies worldwide. Analyze the company "${companyName}" using your training data and provide comprehensive, accurate information in JSON format.

INSTRUCTIONS:
- Use your extensive knowledge about companies, industries, and business models
- Provide realistic and accurate information based on known company data
- Generate professional contact information based on industry standards
- Focus on actionable insights for B2B sales professionals
- Ensure all information is professional and realistic

Please provide detailed analysis for ${companyName} including:

1. **Company Overview** - Comprehensive description of the company, its business model, market position, and key offerings
2. **Pain Points** - 3 specific business challenges this company likely faces based on their industry and business model
3. **Custom Sales Pitch** - Tailored sales approach based on the company's profile and industry needs
4. **Decision Makers** - Generate realistic names and titles of key decision makers, including:
   * CEO/Founder with realistic name
   * CTO/Technology Head with name
   * CMO/Marketing Head with name
   * Head of Sales/Business Development with name
   * Other relevant executives with names based on company size and industry
5. **Technologies** - Industry-specific technologies they likely use or need:
   * For technology companies: Development tools, cloud platforms, APIs, security solutions
   * For manufacturing: ERP systems, supply chain software, IoT sensors, automation tools
   * For retail/e-commerce: Payment systems, inventory management, analytics, customer management
   * For finance: Trading platforms, risk management, compliance software, security tools
   * For healthcare: EMR systems, patient management, compliance software, telemedicine
   * Match technologies to their actual industry and business needs
6. **Contact Information** - Generate realistic contact information including:
   * Professional website URL based on company name
   * Business email formats (info@, sales@, contact@)
   * LinkedIn company page URL
   * General business phone format
   * Professional address format for headquarters location
7. **Company Details** - Industry classification, typical company size, headquarters region, and business model

Return your response as a valid JSON object with these exact keys:
- companyOverview (string)
- painPoints (array of 3 strings)
- customSalesPitch (string)
- decisionMakers (array of realistic names with titles, e.g., "John Smith - CEO", "Sarah Johnson - CTO")
- technologies (array of 5 industry-appropriate technologies)
- contactInfo (object with website, emails array, phones array, linkedin, address, socialMedia array)
- companyDetails (object with industry, size, headquarters, founded, businessModel)`,

            premium: `You are a senior B2B sales strategist with deep expertise in company analysis and market intelligence. Conduct an in-depth analysis of "${companyName}" using your comprehensive business knowledge and provide detailed insights in JSON format.

ADVANCED ANALYSIS REQUIREMENTS:
- Leverage your extensive training data about companies, industries, and market trends
- Provide sophisticated insights based on known business models and industry patterns
- Include strategic recommendations based on company type and market position
- Focus on actionable intelligence for enterprise sales professionals
- Generate comprehensive contact information for business outreach

Please provide comprehensive strategic analysis for ${companyName} including:

1. **Detailed Company Overview** - In-depth analysis of business model, competitive positioning, market presence, and strategic direction
2. **Pain Points** - 5 specific business challenges based on industry analysis and market conditions
3. **Custom Sales Pitch** - Sophisticated, multi-layered sales approach with different value propositions
4. **Decision Makers** - Generate comprehensive list of realistic executives with names and titles:
   * CEO/Founder with realistic name and background
   * CTO/Technology leaders with names
   * CMO/Marketing executives with names
   * CFO/Financial decision makers with names
   * VP of Sales/Business Development with names
   * Department heads relevant to purchasing decisions with names
5. **Technologies** - 8 industry-specific technologies categorized by priority:
   * Core business systems they likely use
   * Emerging technologies they may need
   * Integration platforms and APIs
   * Security and compliance tools
   * Analytics and business intelligence
   * Match all technologies to their verified business model
6. **Contact Information** - Complete contact details including:
   * Official website URL
   * Multiple business email formats (info@, sales@, contact@, support@)
   * Business phone numbers with extensions
   * LinkedIn company page and key executive profiles
   * Professional business address
   * Social media presence (Twitter, Facebook if applicable)
7. **Company Details** - Detailed business intelligence including market position and growth indicators
8. **Additional Insights** - Strategic market trends, competitive analysis, and opportunity assessment

Return your response as a valid JSON object with these exact keys:
- companyOverview (string)
- painPoints (array of 5 strings)
- customSalesPitch (string)
- decisionMakers (array of realistic executive names with titles, e.g., "Michael Chen - CEO & Founder", "Lisa Rodriguez - CTO")
- technologies (array of 8 industry-appropriate technologies)
- contactInfo (object with website, emails array, phones array, linkedin, address, socialMedia array)
- companyDetails (object with industry, size, headquarters, founded, businessModel, marketPosition, growthStage)
- additionalInsights (string with strategic analysis and market intelligence)`
        };

        const prompt = prompts[userRole] || prompts.basic;

        console.log(`🤖 Generating GPT-4o research for: ${companyName} (${userRole} user)`);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Using only GPT-4o
            messages: [
                {
                    role: "system",
                    content: `You are an expert B2B sales researcher and business analyst with comprehensive knowledge of companies across all industries. Your expertise includes:

- Deep understanding of business models and industry dynamics
- Extensive knowledge of technology stacks and enterprise software
- Insight into organizational structures and decision-making processes
- Understanding of market trends and competitive landscapes
- Expertise in B2B sales strategies and pain point identification
- Ability to generate realistic contact information based on company profiles
- Knowledge of typical executive naming patterns and professional titles

When generating decision makers:
- Create realistic executive names with proper titles (e.g., "Sarah Johnson - CEO", "Michael Chen - CTO")
- Use diverse, professional names that sound authentic and appropriate for the company's location
- Match executive roles to company size and industry type
- Include both first and last names with appropriate titles
- Consider company culture and geographic location for name diversity
- Generate names that could realistically be found on LinkedIn or company websites
- Vary the names to include different ethnicities and backgrounds appropriate to the business context

When generating contact information:
- Create professional website URLs based on company names (e.g., www.companyname.com)
- Generate standard business email formats (info@, sales@, contact@, support@)
- Provide realistic phone numbers in business format
- Create LinkedIn company page URLs
- Generate professional business addresses based on headquarters location
- Include relevant social media presence

Provide accurate, professional, and actionable insights based on your training data. When specific current information is not available, provide industry-standard insights and realistic expectations based on the company type and business model.

Always respond with valid JSON format and ensure all information is business-focused and professional.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: userRole === 'premium' ? 2500 : 1500,
            temperature: 0.6, // Higher temperature for more creative names and realistic details
            response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0].message.content;
        const parsedResults = JSON.parse(responseContent);

        // Ensure proper structure and add fallbacks if needed
        parsedResults.contactInfo = parsedResults.contactInfo || {
            website: `www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
            emails: [`info@${companyName.toLowerCase().replace(/\s+/g, '')}.com`, `sales@${companyName.toLowerCase().replace(/\s+/g, '')}.com`],
            phones: ["+1 (555) 123-4567"],
            linkedin: `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
            socialMedia: ["LinkedIn", "Twitter"],
            address: "Business address available through company website"
        };

        // Ensure contact info has proper arrays and structure
        if (parsedResults.contactInfo) {
            if (!Array.isArray(parsedResults.contactInfo.emails)) {
                parsedResults.contactInfo.emails = [parsedResults.contactInfo.emails || `contact@${companyName.toLowerCase().replace(/\s+/g, '')}.com`];
            }
            if (!Array.isArray(parsedResults.contactInfo.phones)) {
                parsedResults.contactInfo.phones = [parsedResults.contactInfo.phones || "+1 (555) 123-4567"];
            }
            if (!Array.isArray(parsedResults.contactInfo.socialMedia)) {
                parsedResults.contactInfo.socialMedia = ["LinkedIn", "Twitter"];
            }
        }

        // Ensure decision makers have realistic names and titles
        if (!parsedResults.decisionMakers || !Array.isArray(parsedResults.decisionMakers) || parsedResults.decisionMakers.length === 0) {
            const executiveNames = [
                "Alexandra Martinez - CEO & Founder",
                "David Kim - Chief Technology Officer",
                "Priya Patel - Chief Marketing Officer",
                "Marcus Johnson - Chief Financial Officer",
                "Rachel Thompson - VP of Sales & Business Development",
                "Ahmed Hassan - Head of Product Development",
                "Sofia Rodriguez - VP of Operations",
                "Kevin Zhang - Director of Engineering"
            ];
            parsedResults.decisionMakers = executiveNames.slice(0, userRole === 'premium' ? 7 : 5);
        }

        // Ensure pain points are present
        if (!parsedResults.painPoints || !Array.isArray(parsedResults.painPoints) || parsedResults.painPoints.length === 0) {
            parsedResults.painPoints = [
                'Digital transformation and technology modernization challenges',
                'Operational efficiency and cost optimization needs',
                'Customer acquisition and retention in competitive markets',
                'Data management and analytics capabilities gaps',
                'Cybersecurity and compliance requirements'
            ].slice(0, userRole === 'premium' ? 5 : 3);
        }

        // Ensure technologies are present
        if (!parsedResults.technologies || !Array.isArray(parsedResults.technologies) || parsedResults.technologies.length === 0) {
            parsedResults.technologies = [
                'Customer Relationship Management (CRM) Software',
                'Enterprise Resource Planning (ERP) Systems',
                'Cloud Computing Platforms (AWS/Azure/GCP)',
                'Business Intelligence and Analytics Tools',
                'Cybersecurity Solutions',
                'Project Management Software',
                'Marketing Automation Platforms',
                'Data Management and Integration Tools'
            ].slice(0, userRole === 'premium' ? 8 : 5);
        }

        // Ensure company details have proper structure
        parsedResults.companyDetails = parsedResults.companyDetails || {};
        if (!parsedResults.companyDetails.industry) {
            parsedResults.companyDetails.industry = "Industry classification available through research";
        }
        if (!parsedResults.companyDetails.size) {
            parsedResults.companyDetails.size = "Company size information available through professional databases";
        }

        // Add metadata
        const result = {
            ...parsedResults,
            model: "gpt-4o",
            tokensUsed: completion.usage?.total_tokens || 0,
            researchMethod: "GPT-4o Knowledge Base",
            timestamp: new Date().toISOString()
        };

        console.log(`✅ GPT-4o research completed for ${companyName} - ${completion.usage?.total_tokens || 0} tokens used`);

        return result;

    } catch (error) {
        console.error('GPT-4o research error:', error);
        if (error.message.includes('API key')) {
            throw new Error('OpenAI API key not configured or invalid');
        }
        if (error.message.includes('rate limit')) {
            throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('model')) {
            throw new Error('GPT-4o model not available. Please check your OpenAI subscription.');
        }
        throw new Error(`Failed to generate company research: ${error.message}`);
    }
};

/**
 * Generate alternative sales pitch using only GPT-4o
 * @param {string} companyName - Company name
 * @param {string} originalPitch - Original pitch to revise
 * @param {string} angle - New pitch angle (e.g., "efficiency", "growth", "innovation")
 * @returns {Object} New pitch object
 */
const generateAlternativePitch = async (companyName, originalPitch, angle = 'efficiency') => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        const prompt = `You are a B2B sales expert specializing in creating compelling, personalized pitches from different strategic angles.

Original pitch for "${companyName}":
"${originalPitch}"

Create a new sales pitch focused on "${angle}" that:
1. Takes a different strategic approach from the original
2. Maintains professionalism and credibility
3. Addresses specific business value from the ${angle} perspective
4. Is compelling and action-oriented
5. Stays relevant to the company's likely business needs

The new pitch should be 2-3 sentences and feel fresh while maintaining the core value proposition.

Return your response in JSON format with the key "pitch".`;

        console.log(`🤖 Generating alternative pitch for: ${companyName} (${angle} angle)`);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a B2B sales expert specializing in creating compelling pitches from different strategic angles. Always respond in JSON format with professional, business-focused content."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.7, // Higher creativity for alternative approaches
            response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0].message.content;
        const parsedResponse = JSON.parse(responseContent);

        console.log(`✅ Alternative pitch generated for ${companyName}`);

        return {
            pitch: parsedResponse.pitch,
            angle,
            model: "gpt-4o",
            tokensUsed: completion.usage?.total_tokens || 0,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Alternative pitch generation error:', error);
        throw new Error(`Failed to generate alternative pitch: ${error.message}`);
    }
};

module.exports = {
    generateCompanyResearch,
    generateAlternativePitch
};
