const Research = require('../models/Research');
const { generateCompanyResearch, generateAlternativePitch } = require('../services/openai');
const vectorService = require('../services/vectorService');


const generateResearch = async (req, res) => {
    try {
        const { companyName, companyWebsite, industry } = req.body;
        const userId = req.user._id;
        const userRole = req.user.role;

        console.log(`🔍 Generating GPT-4o research for ${companyName} by user ${req.user.email} (${userRole})`);

        // Generate research using GPT-4o with real company data
        const aiResults = await generateCompanyResearch(companyName, userRole, companyWebsite);

        // Create research record
        const research = new Research({
            userId,
            companyName,
            companyWebsite,
            industry,
            results: {
                overview: aiResults.companyOverview,
                companyDetails: aiResults.companyDetails,
                contactInfo: aiResults.contactInfo,
                painPoints: aiResults.painPoints,
                pitch: aiResults.customSalesPitch,
                decisionMakers: aiResults.decisionMakers,
                technologies: aiResults.technologies,
                additionalInsights: aiResults.additionalInsights
            },
            aiModel: aiResults.model,
            promptUsed: `GPT-4o company research for ${companyName} - ${userRole} user`,
            tokensUsed: aiResults.tokensUsed,
            researchMethod: aiResults.researchMethod || 'GPT-4o Knowledge Base'
        });

        await research.save();

        // Store embeddings for vector search
        try {
            const researchText = `${aiResults.companyOverview} ${aiResults.painPoints.join(' ')} ${aiResults.customSalesPitch} ${aiResults.additionalInsights || ''}`;
            const metadata = {
                industry,
                website: companyWebsite,
                tags: [userRole, 'gpt4o-generated', 'ai-research'],
                model: 'gpt-4o'
            };
            await vectorService.storeCompanyEmbedding(companyName, researchText, userId, metadata);
            console.log(`✅ Vector embeddings stored for ${companyName}`);
        } catch (embeddingError) {
            console.error('⚠️ Failed to store embeddings:', embeddingError);
            // Continue execution even if embedding storage fails
        }

        console.log(`✅ Research completed for ${companyName} - ${aiResults.tokensUsed} tokens used`);

        res.json({
            message: 'Research generated successfully using GPT-4o',
            research: {
                _id: research._id,
                companyName: research.companyName,
                companyWebsite: research.companyWebsite,
                industry: research.industry,
                results: research.results,
                createdAt: research.createdAt,
                isSaved: research.isSaved,
                rating: research.rating,
                notes: research.notes,
                tags: research.tags
            },
            tokensUsed: aiResults.tokensUsed,
            model: aiResults.model,
            researchMethod: aiResults.researchMethod
        });

    } catch (error) {
        console.error('Research generation error:', error);

        // Handle company validation errors specifically
        if (error.message.includes('INVALID_COMPANY:')) {
            return res.status(400).json({
                error: 'Invalid Company',
                message: error.message.replace('INVALID_COMPANY: ', ''),
                type: 'COMPANY_VALIDATION_ERROR'
            });
        }

        if (error.message.includes('OpenAI') || error.message.includes('API key')) {
            return res.status(503).json({
                error: 'AI service unavailable',
                message: error.message
            });
        }

        if (error.message.includes('rate limit')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'GPT-4o API rate limit exceeded. Please try again later.'
            });
        }

        res.status(500).json({
            error: 'Research generation failed',
            message: 'An error occurred while generating company research using GPT-4o'
        });
    }
};


const getHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const research = await Research.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-promptUsed -__v');

        const total = await Research.countDocuments({ userId });

        res.json({
            research,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            error: 'Failed to get history',
            message: 'An error occurred while fetching research history'
        });
    }
};

const getResearchById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const research = await Research.findOne({ _id: id, userId })
            .select('-promptUsed -__v');

        if (!research) {
            return res.status(404).json({
                error: 'Research not found'
            });
        }

        res.json({ research });

    } catch (error) {
        console.error('Get research error:', error);
        res.status(500).json({
            error: 'Failed to get research',
            message: 'An error occurred while fetching research'
        });
    }
};


const toggleSaveResearch = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { notes, rating, tags } = req.body;

        const research = await Research.findOne({ _id: id, userId });

        if (!research) {
            return res.status(404).json({
                error: 'Research not found'
            });
        }

        research.isSaved = !research.isSaved;

        if (notes !== undefined) research.notes = notes;
        if (rating !== undefined) research.rating = rating;
        if (tags !== undefined) research.tags = tags;

        await research.save();

        res.json({
            message: research.isSaved ? 'Research saved successfully' : 'Research unsaved successfully',
            research: {
                _id: research._id,
                isSaved: research.isSaved,
                notes: research.notes,
                rating: research.rating,
                tags: research.tags
            }
        });

    } catch (error) {
        console.error('Toggle save research error:', error);
        res.status(500).json({
            error: 'Failed to update research',
            message: 'An error occurred while updating research'
        });
    }
};

const deleteResearch = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const research = await Research.findOneAndDelete({ _id: id, userId });

        if (!research) {
            return res.status(404).json({
                error: 'Research not found'
            });
        }

        res.json({
            message: 'Research deleted successfully'
        });

    } catch (error) {
        console.error('Delete research error:', error);
        res.status(500).json({
            error: 'Failed to delete research',
            message: 'An error occurred while deleting research'
        });
    }
};


const generateAlternative = async (req, res) => {
    try {
        const { id } = req.params;
        const { angle } = req.body;
        const userId = req.user._id;

        if (req.user.role !== 'premium') {
            return res.status(403).json({
                error: 'Premium feature',
                message: 'Alternative pitch generation requires a premium subscription'
            });
        }

        const research = await Research.findOne({ _id: id, userId });

        if (!research) {
            return res.status(404).json({
                error: 'Research not found'
            });
        }

        const alternativePitch = await generateAlternativePitch(
            research.companyName,
            research.results.pitch,
            angle
        );

        res.json({
            message: 'Alternative pitch generated successfully',
            originalPitch: research.results.pitch,
            alternativePitch: alternativePitch.pitch,
            angle: alternativePitch.angle
        });

    } catch (error) {
        console.error('Generate alternative pitch error:', error);

        if (error.message.includes('OpenAI')) {
            return res.status(503).json({
                error: 'AI service unavailable',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Failed to generate alternative pitch',
            message: 'An error occurred while generating alternative pitch'
        });
    }
};

const searchResearch = async (req, res) => {
    try {
        const { q } = req.query;
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const research = await Research.searchUserResearch(userId, q)
            .skip(skip)
            .limit(limit)
            .select('-promptUsed -__v');

        const total = await Research.countDocuments({
            userId,
            $or: [
                { companyName: { $regex: q, $options: 'i' } },
                { 'results.overview': { $regex: q, $options: 'i' } },
                { 'results.pitch': { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ]
        });

        res.json({
            research,
            query: q,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Search research error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: 'An error occurred while searching research'
        });
    }
};

const getSavedResearch = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const research = await Research.find({ userId, isSaved: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-promptUsed -__v');

        const total = await Research.countDocuments({ userId, isSaved: true });

        res.json({
            research,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get saved research error:', error);
        res.status(500).json({
            error: 'Failed to get saved research',
            message: 'An error occurred while fetching saved research'
        });
    }
};


const vectorSearch = async (req, res) => {
    try {
        const { query, limit = 5, threshold = 0.7 } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Search query is required'
            });
        }

        console.log(`🔍 Vector search for: "${query}"`);

        const results = await vectorService.searchSimilarCompanies(query, limit, threshold);

        res.json({
            message: 'Vector search completed',
            results,
            query,
            count: results.length
        });

    } catch (error) {
        console.error('Vector search error:', error);
        res.status(500).json({
            error: 'Vector search failed',
            message: 'An error occurred while performing vector search'
        });
    }
};


const getRecommendations = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 5;

        console.log(`📋 Getting recommendations for user ${req.user.email}`);

        const recommendations = await vectorService.getCompanyRecommendations(userId, limit);

        res.json({
            message: 'Recommendations retrieved',
            recommendations,
            count: recommendations.length
        });

    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({
            error: 'Failed to get recommendations',
            message: 'An error occurred while fetching recommendations'
        });
    }
};


const storeEmbedding = async (req, res) => {
    try {
        const { companyName, researchData, metadata = {} } = req.body;
        const userId = req.user._id;

        if (!companyName || !researchData) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Company name and research data are required'
            });
        }

        console.log(`💾 Storing embedding for ${companyName}`);

        const result = await vectorService.storeCompanyEmbedding(companyName, researchData, userId, metadata);

        res.json({
            message: 'Embedding stored successfully',
            data: {
                _id: result._id,
                companyName: result.companyName,
                createdAt: result.createdAt
            }
        });

    } catch (error) {
        console.error('Store embedding error:', error);
        res.status(500).json({
            error: 'Failed to store embedding',
            message: 'An error occurred while storing the embedding'
        });
    }
};


const getUserEmbeddings = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;

        console.log(`📋 Getting embeddings for user ${req.user.email}`);

        const result = await vectorService.getEmbeddingsByUser(userId, limit, page);

        res.json({
            message: 'Embeddings retrieved successfully',
            embeddings: result.embeddings,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Get embeddings error:', error);
        res.status(500).json({
            error: 'Failed to get embeddings',
            message: 'An error occurred while fetching embeddings'
        });
    }
};


const searchEmbeddings = async (req, res) => {
    try {
        const { companyName } = req.query;
        const userId = req.user._id;

        if (!companyName) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Company name is required'
            });
        }

        console.log(`🔍 Searching embeddings for: "${companyName}"`);

        const results = await vectorService.searchByCompanyName(companyName, userId);

        res.json({
            message: 'Search completed',
            results,
            count: results.length
        });

    } catch (error) {
        console.error('Search embeddings error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: 'An error occurred while searching embeddings'
        });
    }
};

module.exports = {
    generateResearch,
    getHistory,
    getResearchById,
    toggleSaveResearch,
    deleteResearch,
    generateAlternative,
    searchResearch,
    getSavedResearch,
    vectorSearch,
    getRecommendations,
    storeEmbedding,
    getUserEmbeddings,
    searchEmbeddings
};
