const OpenAI = require('openai');
const { searchCompanyInfo } = require('./webSearch');


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

CRITICAL INSTRUCTIONS:
- ONLY use information you can verify or that is publicly available
- If you cannot find specific details, use "Not available" rather than making up fake information
- For decision makers: ONLY include names if you have reliable sources (LinkedIn, company website, verified news)
- For contact info: ONLY include information that appears legitimate and verifiable
- Avoid speculation, assumptions, or generic placeholders

Please analyze and provide the following information about ${companyName}:

1. Company Overview - Detailed description based on verified information only
2. Pain Points - 3 realistic challenges based on their verified industry/business model
3. Custom Sales Pitch - Tailored pitch based on confirmed company information
4. Decision Makers - ONLY include names if found in reliable sources (LinkedIn profiles, official company pages, verified news). If no verified names found, use "Not available"
5. Technologies - INDUSTRY-SPECIFIC technologies based on their actual verified business:
   * For automotive: Fleet management, GPS tracking, Vehicle diagnostics, Dealer systems
   * For e-commerce: Payment gateways, Inventory systems, Analytics, Mobile commerce
   * For technology/software: Development frameworks, Cloud platforms, APIs, Database systems
   * For manufacturing: ERP systems, Supply chain software, Quality control, IoT sensors
   * For finance: Trading platforms, Risk management, Compliance software, Banking systems
   * Match technologies to their CONFIRMED industry, not generic assumptions
6. Contact Information - ONLY verified contact details from reliable sources
7. Company Details - Only confirmed information about industry, size, location, founding

CONTACT INFORMATION RULES:
- website: Use ONLY the verified official website found in search results
- emails: Use ONLY email addresses found in search results or logical formats based on verified domain
- phones: Use ONLY phone numbers found in search results, otherwise "Not available"
- linkedin: Use ONLY actual LinkedIn company page found, otherwise "Not available"
- address: Use ONLY verified headquarters address found, otherwise "Not available"

DECISION MAKERS VALIDATION - CRITICAL:
- ONLY use names explicitly found in search results with clear job titles
- Names must be from verified sources (LinkedIn, company website, news articles)
- EXCLUDE names that appear randomly or seem generic/fake
- EXCLUDE names like "Donald Trump", "Generic Names", or politically unrelated figures
- Verify the person actually works for this specific company
- If uncertain about authenticity, use "Not available" instead
- Better to return "Not available" than incorrect executive names

Return your response as a valid JSON object with these exact keys:
- companyOverview (string)
- painPoints (array of 3 strings)
- customSalesPitch (string)
- decisionMakers (array of verified names or "Not available" if none found)
- technologies (array of 5 industry-appropriate technologies)
- contactInfo (object with website, emails, phones, linkedin, socialMedia, address)
- companyDetails (object with industry, size, headquarters, founded, businessModel)

REMEMBER: Accuracy over completeness. Use "Not available" when information cannot be verified.`,

            premium: `You are a senior B2B sales strategist with access to comprehensive company databases. Conduct an in-depth analysis of the REAL company "${companyName}" and provide ACCURATE, VERIFIED insights in JSON format.

CRITICAL VALIDATION REQUIREMENTS:
- ONLY provide information that can be verified through reliable sources
- Use "Not available" for information you cannot confirm rather than generating assumptions
- For executive names: ONLY include if found in verified sources (LinkedIn, official company pages, credible news)
- For contact details: ONLY include information that appears in reliable search results
- Prioritize accuracy over completeness - better to have fewer verified facts than many unverified claims

Please provide comprehensive analysis including:

1. Detailed Company Overview - In-depth analysis based on verified business model and market position
2. Pain Points - 5 specific business challenges based on their confirmed industry and verified size
3. Custom Sales Pitch - Sophisticated, personalized pitch based on verified company profile
4. Decision Makers - ONLY verified executive names from reliable sources. If no verified names found, use "Not available"
5. Technologies - Industry-specific technologies based on their confirmed business:
   * Automotive: Fleet management, GPS tracking, Vehicle diagnostics, Dealer management systems
   * E-commerce: Payment gateways, Inventory management, Customer analytics, Mobile commerce platforms
   * Technology: Development frameworks, Cloud platforms, DevOps tools, APIs, Database systems
   * Manufacturing: ERP systems, Supply chain software, Quality control, IoT sensors, Automation tools
   * Finance: Trading platforms, Risk management, Compliance software, Banking systems, Security tools
   * Match technologies to their VERIFIED industry and business model
6. Contact Information - ONLY verified contact details from search results
7. Company Details - VERIFIED detailed company information
8. Additional Insights - Real market trends and factual developments only

EXECUTIVE NAME VERIFICATION - MANDATORY CHECKS:
- Names MUST be traceable to verified sources (LinkedIn profiles, company websites, verified news)
- EXCLUDE names that seem fake, generic, or politically unrelated to the company
- EXCLUDE random names without clear company executive connection
- Validate that the person currently works for this specific company in a leadership role
- If ANY doubt about authenticity, EXCLUDE the name entirely
- Quality over quantity - use "Not available" if no verified executives found

CONTACT INFORMATION REQUIREMENTS:
- website: Must be the verified official website from search results
- emails: Only email addresses found in search results or verified domain-based formats
- phones: Only phone numbers found in search results, otherwise "Not available"
- linkedin: Only actual LinkedIn company page found in search, otherwise "Not available"
- address: Only verified headquarters address from search results, otherwise "Not available"
- socialMedia: Only platforms confirmed to be operated by the company

Return your response as a valid JSON object with these exact keys:
- companyOverview (string)
- painPoints (array of 5 strings)
- customSalesPitch (string)
- decisionMakers (array of verified names or "Not available" if none verified)
- technologies (array of 8 industry-appropriate technologies)
- contactInfo (object with website, emails, phones, linkedin, socialMedia, address)
- companyDetails (object with industry, size, headquarters, founded, businessModel, revenue, recentNews)
- additionalInsights (string)

VERIFICATION PRIORITY: Only include information you can reasonably verify. Use "Not available" when uncertain.`
        };

        const prompt = prompts[userRole] || prompts.basic;

        // First, get real-time company information via web search
        console.log(`🔍 Searching for real-time information about ${companyName}...`);
        const realTimeData = await searchCompanyInfo(companyName);

        // Enhance the prompt with real-time data if available
        let enhancedPrompt = prompt;
        if (realTimeData && !realTimeData.error) {
            enhancedPrompt += `\n\nREAL-TIME SEARCH RESULTS FOR ${companyName}:`;
            if (realTimeData.website) {
                enhancedPrompt += `\n- Official Website: ${realTimeData.website}`;
            }
            if (realTimeData.description) {
                enhancedPrompt += `\n- Company Description: ${realTimeData.description}`;
            }
            if (realTimeData.contactInfo) {
                if (realTimeData.contactInfo.linkedin) {
                    enhancedPrompt += `\n- LinkedIn: ${realTimeData.contactInfo.linkedin}`;
                }
                if (realTimeData.contactInfo.emails && realTimeData.contactInfo.emails.length > 0) {
                    enhancedPrompt += `\n- Found Emails: ${realTimeData.contactInfo.emails.join(', ')}`;
                }
                if (realTimeData.contactInfo.phones && realTimeData.contactInfo.phones.length > 0) {
                    enhancedPrompt += `\n- Found Phones: ${realTimeData.contactInfo.phones.join(', ')}`;
                }
            }
            if (realTimeData.companyDetails) {
                if (realTimeData.companyDetails.industry !== 'Not available') {
                    enhancedPrompt += `\n- Industry: ${realTimeData.companyDetails.industry}`;
                }
                if (realTimeData.companyDetails.headquarters !== 'Not available') {
                    enhancedPrompt += `\n- Headquarters: ${realTimeData.companyDetails.headquarters}`;
                }
            }
            if (realTimeData.decisionMakers && realTimeData.decisionMakers.length > 0) {
                enhancedPrompt += `\n- ACTUAL DECISION MAKERS FOUND: ${realTimeData.decisionMakers.join(', ')}`;
            }
            enhancedPrompt += `\n\nUSE THIS REAL-TIME DATA IN YOUR RESPONSE. If the search found actual contact information, use it instead of generating placeholder data. If real decision maker names were found, use those exact names instead of generic titles.`;
        }

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert B2B sales researcher with access to real company data. CRITICAL: Only provide accurate, verifiable information about companies. Use "Not available" for information you cannot verify rather than creating fake details. Focus on providing realistic, industry-appropriate insights based on publicly available information. Always respond with valid JSON format.'
                },
                {
                    role: 'user',
                    content: enhancedPrompt
                }
            ],
            max_tokens: userRole === 'premium' ? 2000 : 1200,
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0].message.content;
        const parsedResults = JSON.parse(responseContent);

        // Merge real-time data with AI results, prioritizing real-time data
        if (realTimeData && !realTimeData.error) {
            console.log(`✅ Merging real-time data for ${companyName}`);

            // Use real website if found
            if (realTimeData.website && (!parsedResults.contactInfo || !parsedResults.contactInfo.website)) {
                parsedResults.contactInfo = parsedResults.contactInfo || {};
                parsedResults.contactInfo.website = realTimeData.website;
            }

            // Use real LinkedIn if found
            if (realTimeData.contactInfo && realTimeData.contactInfo.linkedin) {
                parsedResults.contactInfo = parsedResults.contactInfo || {};
                parsedResults.contactInfo.linkedin = realTimeData.contactInfo.linkedin;
            }

            // Use real emails if found
            if (realTimeData.contactInfo && realTimeData.contactInfo.emails && realTimeData.contactInfo.emails.length > 0) {
                parsedResults.contactInfo = parsedResults.contactInfo || {};
                parsedResults.contactInfo.emails = realTimeData.contactInfo.emails;
            }

            // Use real phones if found
            if (realTimeData.contactInfo && realTimeData.contactInfo.phones && realTimeData.contactInfo.phones.length > 0) {
                parsedResults.contactInfo = parsedResults.contactInfo || {};
                parsedResults.contactInfo.phones = realTimeData.contactInfo.phones;
            }

            // Use real company details if found
            if (realTimeData.companyDetails) {
                parsedResults.companyDetails = parsedResults.companyDetails || {};
                if (realTimeData.companyDetails.industry !== 'Not available') {
                    // Clean up industry text
                    let cleanIndustry = realTimeData.companyDetails.industry
                        .replace(/^(is\s+|are\s+)/i, '')
                        .replace(/\s*(company|corporation|business|firm)\s*$/i, '')
                        .replace(/\s*in\?\s*/gi, '')
                        .replace(/\s*'s\s*$/i, '')
                        .trim();

                    if (cleanIndustry.length > 3) {
                        parsedResults.companyDetails.industry = cleanIndustry;
                    }
                }
                if (realTimeData.companyDetails.headquarters !== 'Not available') {
                    parsedResults.companyDetails.headquarters = realTimeData.companyDetails.headquarters;
                }
                if (realTimeData.companyDetails.size !== 'Not available') {
                    parsedResults.companyDetails.size = realTimeData.companyDetails.size;
                }
                if (realTimeData.companyDetails.founded !== 'Not available') {
                    parsedResults.companyDetails.founded = realTimeData.companyDetails.founded;
                }
            }

            // Use real decision makers if found
            if (realTimeData.decisionMakers && realTimeData.decisionMakers.length > 0) {
                parsedResults.decisionMakers = realTimeData.decisionMakers;
                console.log(`✅ Using ${realTimeData.decisionMakers.length} real decision makers for ${companyName}`);
            }
        }

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
