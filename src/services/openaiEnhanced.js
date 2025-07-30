const OpenAI = require('openai');
const { searchCompanyInfo } = require('./webSearch');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Enhanced company research generation with fallbacks
 * @param {string} companyName - Name of the company to research
 * @param {string} userRole - User's role (basic/premium) for different prompts
 * @returns {Object} Research results
 */
const generateCompanyResearch = async (companyName, userRole = 'basic') => {
    try {
        console.log(`🧠 Starting AI research for: ${companyName} (${userRole} user)`);

        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ OpenAI API key not configured');
            return generateFallbackResearch(companyName, userRole);
        }

        // Step 1: Get real company data
        let realTimeData = null;

        try {
            // Get real-time data from web search
            realTimeData = await searchCompanyInfo(companyName);
            console.log(`🔍 Retrieved real-time data for ${companyName}:`,
                realTimeData ? 'Success' : 'No data found');
        } catch (error) {
            console.warn(`⚠️ Web search failed for ${companyName}:`, error.message);
            realTimeData = null;
        }

        // Step 2: Generate AI research with real data
        const prompt = createResearchPrompt(companyName, realTimeData, userRole);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Upgraded to GPT-4o for better results
            messages: [
                {
                    role: "system",
                    content: `You are a B2B sales research expert specializing in generating comprehensive company insights for sales professionals. 

Your expertise includes:
- Company analysis and market positioning
- Identifying key decision makers and pain points
- Crafting personalized sales strategies
- Industry trend analysis
- Competitive landscape assessment
- Value proposition development

CRITICAL ACCURACY REQUIREMENTS:
- NEVER provide generic or unrelated executive names (like Elon Musk, Jeff Bezos, Tim Cook, etc.) unless they are actually associated with the specific company being researched
- NEVER make up decision maker names or use names from other companies
- If specific decision makers are not available in the provided data, clearly state this and provide guidance on how to find accurate contact information
- Only use information that is specifically related to the company being researched
- When uncertain about specific details, indicate this clearly rather than providing potentially incorrect information
- For decision makers section: If you don't have verified names, write "Leadership information requires additional research" and provide research guidance

BANNED NAMES (never use unless actually verified for the specific company):
Elon Musk, Jeff Bezos, Bill Gates, Tim Cook, Sundar Pichai, Satya Nadella, Mark Zuckerberg, Larry Page, Sergey Brin, Jack Ma, Warren Buffett, Jack Dorsey, Reed Hastings

Always provide accurate, professional, and actionable insights that help sales professionals engage effectively with prospects.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: userRole === 'premium' ? 4000 : 2500,
            temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;

        // Step 3: Validate and enhance results
        const validatedResults = await validateAndEnhanceResults(aiResponse, companyName, realTimeData);

        // Step 4: Additional validation for decision makers
        const cleanedResults = await cleanDecisionMakers(validatedResults, companyName);

        console.log(`✅ AI research completed for ${companyName}`);
        return {
            success: true,
            data: cleanedResults,
            source: 'ai_enhanced',
            hasRealTimeData: !!realTimeData,
            model: 'gpt-4o'
        };

    } catch (error) {
        console.error(`❌ AI research failed for ${companyName}:`, error);

        // Fallback to basic research
        console.log(`🔄 Falling back to basic research for ${companyName}`);
        return generateFallbackResearch(companyName, userRole);
    }
};

/**
 * Create research prompt with real-time data
 * @param {string} companyName - Company name
 * @param {Object} realTimeData - Real-time company data
 * @param {string} userRole - User role (basic/premium)
 * @returns {string} Formatted prompt
 */
const createResearchPrompt = (companyName, realTimeData, userRole) => {
    let prompt = `Generate comprehensive B2B sales research for "${companyName}".`;

    if (realTimeData && Object.keys(realTimeData).some(key => realTimeData[key] && realTimeData[key] !== 'Not available')) {
        prompt += `\n\nReal-time company data:\n`;

        if (realTimeData.description && realTimeData.description !== 'Not available') {
            prompt += `- Description: ${realTimeData.description}\n`;
        }
        if (realTimeData.industry && realTimeData.industry !== 'Not available') {
            prompt += `- Industry: ${realTimeData.industry}\n`;
        }
        if (realTimeData.website && realTimeData.website !== 'Not available') {
            prompt += `- Website: ${realTimeData.website}\n`;
        }
        if (realTimeData.size && realTimeData.size !== 'Not available') {
            prompt += `- Company Size: ${realTimeData.size}\n`;
        }
        if (realTimeData.location && realTimeData.location !== 'Not available') {
            prompt += `- Location: ${realTimeData.location}\n`;
        }
        if (realTimeData.founded && realTimeData.founded !== 'Not available') {
            prompt += `- Founded: ${realTimeData.founded}\n`;
        }
        if (realTimeData.revenue && realTimeData.revenue !== 'Not available') {
            prompt += `- Revenue: ${realTimeData.revenue}\n`;
        }
        if (realTimeData.decisionMakers && realTimeData.decisionMakers.length > 0) {
            prompt += `- Key Decision Makers: ${realTimeData.decisionMakers.join(', ')}\n`;
        }
        if (realTimeData.keyPeople && realTimeData.keyPeople.length > 0) {
            prompt += `- Key People: ${realTimeData.keyPeople.join(', ')}\n`;
        }
        if (realTimeData.recentNews && realTimeData.recentNews.length > 0) {
            prompt += `- Recent News: ${realTimeData.recentNews.slice(0, 3).join('; ')}\n`;
        }

        prompt += `\n\nIMPORTANT: Please use ONLY the above real-time data to identify decision makers and key personnel. Do NOT use generic or unrelated names. If specific decision makers are not available in the real-time data, please indicate this clearly and provide general guidance on finding the right contacts.`;
    } else {
        prompt += `\n\nNote: Limited real-time data available. Please provide comprehensive research based on your training data and general market knowledge for the specific company "${companyName}". 

CRITICAL: Do NOT provide generic decision makers like Elon Musk, Jeff Bezos, etc. unless they are actually associated with "${companyName}". If specific decision makers are not known, please indicate that current leadership information needs to be researched from official sources.`;
    }

    if (userRole === 'premium') {
        prompt += `\n\nProvide PREMIUM DETAILED analysis including:
1. **Company Overview & Market Position**
   - Detailed company description and business model
   - Market position and competitive advantages
   - Recent developments and strategic initiatives

2. **Industry Analysis & Trends**
   - Industry landscape and key trends
   - Market challenges and opportunities
   - Competitive analysis with key players

3. **Key Decision Makers & Organizational Structure**
   - Executive team and key stakeholders (ONLY if specifically known for this company)
   - Department heads and decision influencers
   - Organizational hierarchy and reporting structure
   - **IMPORTANT**: If specific names are not available, clearly state "Leadership information requires additional research" and provide guidance on finding accurate contacts

4. **Pain Points & Business Challenges**
   - Current industry challenges
   - Operational pain points
   - Technology gaps and inefficiencies

5. **Sales Approach & Value Proposition**
   - Recommended sales strategy
   - Key value propositions to emphasize
   - Potential objections and responses

6. **Conversation Starters & Engagement Tips**
   - Personalized conversation openers
   - Industry-specific talking points
   - Relationship building strategies

7. **Market Intelligence & Insights**
   - Financial performance indicators
   - Growth trajectory and expansion plans
   - Partnership and acquisition activity

Please provide detailed, actionable insights with specific examples and data points where possible.`;
    } else {
        prompt += `\n\nProvide STANDARD analysis including:
1. **Company Overview**
   - Brief company description
   - Main business focus and services
   - Market position

2. **Industry Context**
   - Industry overview
   - Key market trends
   - Main competitors

3. **Key Personnel**
   - Senior leadership team (ONLY if specifically known for this company)
   - Key decision makers (avoid generic names)
   - **If specific names unknown**: Provide guidance on researching company leadership

4. **Business Challenges**
   - Common industry pain points
   - Potential areas of improvement

5. **Sales Approach**
   - Basic sales strategy recommendations
   - Value proposition suggestions
   - Initial conversation starters

Please provide clear, concise insights that help with initial prospect engagement.`;
    }

    prompt += `\n\nFormat the response as a well-structured analysis with clear headings and bullet points. Be professional, accurate, and actionable.`;

    return prompt;
};

/**
 * Clean and validate decision makers to remove generic/unrelated names
 * @param {Object} results - Research results
 * @param {string} companyName - Company name for validation
 * @returns {Object} Cleaned results
 */
const cleanDecisionMakers = async (results, companyName) => {
    try {
        // List of generic/famous names that shouldn't appear for most companies
        const genericNames = [
            'Elon Musk', 'Jeff Bezos', 'Bill Gates', 'Tim Cook', 'Sundar Pichai',
            'Satya Nadella', 'Mark Zuckerberg', 'Larry Page', 'Sergey Brin',
            'Jack Ma', 'Ma Yun', 'Warren Buffett', 'Jack Dorsey', 'Reed Hastings',
            'Upmotion Tech', 'Shrijay Sheth Our', 'Raza Saeed Wins', 'Hints Car Prices'
        ];

        // Parse the research content to extract and clean decision makers
        let cleanedResearch = results.research;

        // Look for decision makers section in the research
        const decisionMakersMatch = cleanedResearch.match(/(?:Decision Makers?|Key Personnel|Leadership|Executive Team)[\s\S]*?(?=\n#|\n\*\*|$)/i);

        if (decisionMakersMatch) {
            let decisionMakersSection = decisionMakersMatch[0];

            // Remove generic names from the section
            genericNames.forEach(name => {
                const regex = new RegExp(`[•\\-\\*]?\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n?`, 'gi');
                decisionMakersSection = decisionMakersSection.replace(regex, '');
            });

            // If the section is now mostly empty, replace with guidance
            const remainingContent = decisionMakersSection.replace(/(?:Decision Makers?|Key Personnel|Leadership|Executive Team)[\s\n]*[:\-]*/i, '').trim();

            if (remainingContent.length < 50 || !remainingContent.includes('•') && !remainingContent.includes('-')) {
                decisionMakersSection = `## Decision Makers & Key Personnel

**Current Leadership Information Not Available**

Since specific leadership information for ${companyName} was not found in our current data sources, we recommend:

• **Research the company website**: Check the "About Us", "Team", or "Leadership" pages
• **LinkedIn Company Page**: Look for current executives and key personnel
• **Recent Press Releases**: Search for announcements about leadership changes
• **Industry Publications**: Check automotive trade publications for executive interviews
• **Crunchbase or Similar Platforms**: Professional databases often have leadership information

**Recommended Approach:**
- Start by identifying the CEO, CTO, or Head of Operations
- Look for department heads relevant to your solution (IT, Operations, Marketing)
- Consider reaching out through professional networks or warm introductions`;
            }

            // Replace the original section with the cleaned version
            cleanedResearch = cleanedResearch.replace(decisionMakersMatch[0], decisionMakersSection);
        }

        return {
            ...results,
            research: cleanedResearch
        };

    } catch (error) {
        console.error('❌ Decision makers cleaning failed:', error);
        return results; // Return original results if cleaning fails
    }
};

/**
 * Validate and enhance AI-generated results
 * @param {string} aiResponse - Raw AI response
 * @param {string} companyName - Company name
 * @param {Object} realTimeData - Real-time data used
 * @returns {Object} Enhanced and validated results
 */
const validateAndEnhanceResults = async (aiResponse, companyName, realTimeData) => {
    try {
        // Basic validation
        if (!aiResponse || aiResponse.length < 100) {
            throw new Error('AI response too short or empty');
        }

        // Enhanced response object
        const enhancedResults = {
            company: companyName,
            research: aiResponse,
            timestamp: new Date().toISOString(),
            dataQuality: realTimeData ? 'high' : 'standard',
            sources: ['ai_analysis'],
            metadata: {
                hasRealTimeData: !!realTimeData,
                realTimeDataSources: realTimeData ? Object.keys(realTimeData).filter(key =>
                    realTimeData[key] && realTimeData[key] !== 'Not available'
                ) : [],
                generatedAt: new Date().toISOString(),
                model: 'gpt-4o'
            }
        };

        // Add real-time data summary if available
        if (realTimeData) {
            enhancedResults.sources.push('web_search');
            enhancedResults.realTimeDataSummary = {
                website: realTimeData.website || 'Not available',
                industry: realTimeData.industry || 'Not available',
                size: realTimeData.size || 'Not available',
                location: realTimeData.location || 'Not available'
            };
        }

        return enhancedResults;

    } catch (error) {
        console.error('❌ Result validation failed:', error);

        // Return basic enhanced results even if validation fails
        return {
            company: companyName,
            research: aiResponse || 'Research generation completed with limited data.',
            timestamp: new Date().toISOString(),
            dataQuality: 'basic',
            sources: ['ai_analysis'],
            metadata: {
                hasRealTimeData: false,
                generatedAt: new Date().toISOString(),
                model: 'gpt-4o',
                validationError: error.message
            }
        };
    }
};

/**
 * Generate fallback research when AI fails
 * @param {string} companyName - Company name
 * @param {string} userRole - User role
 * @returns {Object} Fallback research results
 */
const generateFallbackResearch = async (companyName, userRole) => {
    console.log(`🔄 Generating fallback research for ${companyName}`);

    try {
        // Try to get some web data even for fallback
        const webData = await searchCompanyInfo(companyName);

        let fallbackResearch = `# ${companyName} - Company Research\n\n`;

        if (webData && Object.keys(webData).some(key => webData[key] && webData[key] !== 'Not available')) {
            fallbackResearch += `## Company Information\n`;

            if (webData.description && webData.description !== 'Not available') {
                fallbackResearch += `**Description:** ${webData.description}\n\n`;
            }
            if (webData.industry && webData.industry !== 'Not available') {
                fallbackResearch += `**Industry:** ${webData.industry}\n\n`;
            }
            if (webData.website && webData.website !== 'Not available') {
                fallbackResearch += `**Website:** ${webData.website}\n\n`;
            }
            if (webData.location && webData.location !== 'Not available') {
                fallbackResearch += `**Location:** ${webData.location}\n\n`;
            }

            fallbackResearch += `## Sales Recommendations\n`;
            fallbackResearch += `- Research the company's recent developments and news\n`;
            fallbackResearch += `- Identify key decision makers in relevant departments\n`;
            fallbackResearch += `- Understand their industry challenges and pain points\n`;
            fallbackResearch += `- Prepare value propositions relevant to their business model\n`;
            fallbackResearch += `- Consider reaching out through professional networks\n\n`;

        } else {
            fallbackResearch += `## Research Notes\n`;
            fallbackResearch += `We're currently experiencing high demand for our research services. `;
            fallbackResearch += `Here are some general recommendations for approaching ${companyName}:\n\n`;
            fallbackResearch += `### Preparation Steps\n`;
            fallbackResearch += `1. **Company Research**\n`;
            fallbackResearch += `   - Visit their official website and recent news\n`;
            fallbackResearch += `   - Check their LinkedIn company page for updates\n`;
            fallbackResearch += `   - Review their recent press releases or announcements\n\n`;
            fallbackResearch += `2. **Decision Maker Identification**\n`;
            fallbackResearch += `   - Research key executives and department heads\n`;
            fallbackResearch += `   - Identify relevant stakeholders for your solution\n`;
            fallbackResearch += `   - Look for mutual connections or warm introductions\n\n`;
            fallbackResearch += `3. **Industry Context**\n`;
            fallbackResearch += `   - Understand current industry trends and challenges\n`;
            fallbackResearch += `   - Research competitors and market positioning\n`;
            fallbackResearch += `   - Identify potential pain points and opportunities\n\n`;
            fallbackResearch += `### Engagement Strategy\n`;
            fallbackResearch += `- Personalize your outreach based on company-specific information\n`;
            fallbackResearch += `- Lead with industry insights and value propositions\n`;
            fallbackResearch += `- Reference recent company developments when possible\n`;
            fallbackResearch += `- Focus on solving business challenges rather than selling features\n\n`;
        }

        fallbackResearch += `---\n*Research generated with limited data access. Please verify information and conduct additional research as needed.*`;

        return {
            success: true,
            data: {
                company: companyName,
                research: fallbackResearch,
                timestamp: new Date().toISOString(),
                dataQuality: 'fallback',
                sources: webData ? ['web_search'] : ['fallback'],
                metadata: {
                    hasRealTimeData: !!webData,
                    generatedAt: new Date().toISOString(),
                    isFallback: true,
                    model: 'fallback'
                }
            },
            source: 'fallback',
            hasRealTimeData: !!webData
        };

    } catch (error) {
        console.error('❌ Fallback research generation failed:', error);

        return {
            success: false,
            error: 'Research generation temporarily unavailable',
            message: 'We\'re experiencing high demand. Please try again in a few minutes.',
            data: {
                company: companyName,
                research: `Unable to generate research for ${companyName} at this time. Please try again later.`,
                timestamp: new Date().toISOString(),
                dataQuality: 'error',
                sources: [],
                metadata: {
                    hasRealTimeData: false,
                    generatedAt: new Date().toISOString(),
                    error: error.message
                }
            }
        };
    }
};

module.exports = {
    generateCompanyResearch
};
