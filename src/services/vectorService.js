const OpenAI = require('openai');
const mongoose = require('mongoose');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const embeddingSchema = new mongoose.Schema({
    companyName: { type: String, required: true, index: true },
    researchData: { type: String, required: true },
    embedding: { type: [Number], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: {
        industry: String,
        website: String,
        tags: [String]
    }
}, {
    timestamps: true
});

embeddingSchema.index({ companyName: 1, userId: 1 });
embeddingSchema.index({ userId: 1, createdAt: -1 });

const CompanyEmbedding = mongoose.model('CompanyEmbedding', embeddingSchema);

class VectorService {
 
    async generateEmbedding(text) {
        try {
            const response = await openai.embeddings.create({
                model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
                input: text,
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }

    /**
     * @param {number[]} vectorA 
     * @param {number[]} vectorB 
     * @returns {number} - Similarity score between 0 and 1
     */
    cosineSimilarity(vectorA, vectorB) {
        if (vectorA.length !== vectorB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * @param {string} companyName - Name of the company
     * @param {string} researchData - Research data text
     * @param {string} userId - User ID
     * @param {object} metadata - Optional metadata
     * @returns {Promise<object>} - Stored record
     */
    async storeCompanyEmbedding(companyName, researchData, userId, metadata = {}) {
        try {
            const embedding = await this.generateEmbedding(researchData);

            const embeddingDoc = new CompanyEmbedding({
                companyName,
                researchData,
                embedding,
                userId: new mongoose.Types.ObjectId(userId),
                metadata
            });

            const result = await embeddingDoc.save();
            return result;
        } catch (error) {
            console.error('Error storing company embedding:', error);
            throw error;
        }
    }

    /**
     * @param {string} queryText - Search query text
     * @param {number} limit - Number of results to return
     * @param {number} threshold - Similarity threshold (0-1)
     * @param {string} excludeUserId - Optional: exclude results from this user
     * @returns {Promise<Array>} - Array of similar companies
     */
    async searchSimilarCompanies(queryText, limit = 5, threshold = 0.7, excludeUserId = null) {
        try {
            const queryEmbedding = await this.generateEmbedding(queryText);

            const query = excludeUserId
                ? { userId: { $ne: new mongoose.Types.ObjectId(excludeUserId) } }
                : {};

            const allEmbeddings = await CompanyEmbedding.find(query)
                .populate('userId', 'name email')
                .limit(1000) 
                .lean();

            const similarities = allEmbeddings.map(doc => {
                const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
                return {
                    ...doc,
                    similarityScore: similarity
                };
            });

            const results = similarities
                .filter(item => item.similarityScore >= threshold)
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, limit);

            return results;
        } catch (error) {
            console.error('Error searching similar companies:', error);
            throw error;
        }
    }

    /**
     * @param {string} userId - User ID
     * @param {number} limit - Number of recommendations
     * @returns {Promise<Array>} - Array of recommended companies
     */
    async getCompanyRecommendations(userId, limit = 5) {
        try {
            // Get user's recent research history
            const userEmbeddings = await CompanyEmbedding.find({
                userId: new mongoose.Types.ObjectId(userId)
            })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            if (userEmbeddings.length === 0) {
                return [];
            }

            const avgEmbedding = this.averageEmbeddings(userEmbeddings.map(e => e.embedding));

            const otherEmbeddings = await CompanyEmbedding.find({
                userId: { $ne: new mongoose.Types.ObjectId(userId) }
            })
                .populate('userId', 'name email')
                .limit(500)
                .lean();

            const recommendations = otherEmbeddings.map(doc => {
                const similarity = this.cosineSimilarity(avgEmbedding, doc.embedding);
                return {
                    ...doc,
                    similarityScore: similarity
                };
            });

            return recommendations
                .filter(item => item.similarityScore >= 0.6)
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, limit);

        } catch (error) {
            console.error('Error getting company recommendations:', error);
            throw error;
        }
    }

    /**
     * @param {number[][]} embeddings - Array of embedding vectors
     * @returns {number[]} - Averaged embedding vector
     */
    averageEmbeddings(embeddings) {
        if (embeddings.length === 0) return [];

        const dimension = embeddings[0].length;
        const avgEmbedding = new Array(dimension).fill(0);

        for (const embedding of embeddings) {
            for (let i = 0; i < dimension; i++) {
                avgEmbedding[i] += embedding[i];
            }
        }

        for (let i = 0; i < dimension; i++) {
            avgEmbedding[i] /= embeddings.length;
        }

        return avgEmbedding;
    }

    /**     * @param {string} id - Record ID
     * @param {string} newResearchData - Updated research data
     * @returns {Promise<object>} - Updated record
     */
    async updateCompanyEmbedding(id, newResearchData) {
        try {
            const newEmbedding = await this.generateEmbedding(newResearchData);

            const result = await CompanyEmbedding.findByIdAndUpdate(
                id,
                {
                    researchData: newResearchData,
                    embedding: newEmbedding,
                    updatedAt: new Date()
                },
                { new: true }
            );

            return result;
        } catch (error) {
            console.error('Error updating company embedding:', error);
            throw error;
        }
    }

    /**
     * Delete company embedding
     * @param {string} id - Record ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteCompanyEmbedding(id) {
        try {
            const result = await CompanyEmbedding.findByIdAndDelete(id);
            return !!result;
        } catch (error) {
            console.error('Error deleting company embedding:', error);
            throw error;
        }
    }

    /**
     * Get embeddings by user ID
     * @param {string} userId - User ID
     * @param {number} limit - Number of results
     * @param {number} page - Page number
     * @returns {Promise<object>} - Paginated results
     */
    async getEmbeddingsByUser(userId, limit = 20, page = 1) {
        try {
            const skip = (page - 1) * limit;

            const embeddings = await CompanyEmbedding.find({
                userId: new mongoose.Types.ObjectId(userId)
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-embedding') 
                .lean();

            const total = await CompanyEmbedding.countDocuments({
                userId: new mongoose.Types.ObjectId(userId)
            });

            return {
                embeddings,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting embeddings by user:', error);
            throw error;
        }
    }

    /**
     * Search embeddings by company name
     * @param {string} companyName - Company name to search for
     * @param {string} userId - Optional: filter by user ID
     * @returns {Promise<Array>} - Array of matching embeddings
     */
    async searchByCompanyName(companyName, userId = null) {
        try {
            const query = {
                companyName: { $regex: companyName, $options: 'i' }
            };

            if (userId) {
                query.userId = new mongoose.Types.ObjectId(userId);
            }

            const results = await CompanyEmbedding.find(query)
                .populate('userId', 'name email')
                .select('-embedding')
                .sort({ createdAt: -1 })
                .lean();

            return results;
        } catch (error) {
            console.error('Error searching by company name:', error);
            throw error;
        }
    }
}

module.exports = new VectorService();