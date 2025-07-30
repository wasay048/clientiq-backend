#!/usr/bin/env node

/**
 * Test script for MongoDB vector search functionality
 * This script demonstrates how to use the vector search features with MongoDB
 */

const mongoose = require('mongoose');
const vectorService = require('../src/services/vectorService');
require('dotenv').config();

async function testMongoVectorSearch() {
    console.log('🧪 Testing MongoDB Vector Search Functionality...\n');

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clientiq', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB\n');

        // Sample data for testing
        const testCompanies = [
            {
                name: 'TechCorp AI',
                data: 'AI-powered software company specializing in machine learning solutions for enterprise clients. Focus on natural language processing and computer vision.',
                userId: new mongoose.Types.ObjectId(),
                metadata: { industry: 'Technology', tags: ['AI', 'Enterprise'] }
            },
            {
                name: 'DataFlow Systems',
                data: 'Cloud-based data analytics platform helping businesses make data-driven decisions. Specializes in real-time analytics and business intelligence.',
                userId: new mongoose.Types.ObjectId(),
                metadata: { industry: 'Analytics', tags: ['Cloud', 'BI'] }
            },
            {
                name: 'GreenTech Solutions',
                data: 'Renewable energy company developing solar and wind power solutions for commercial and residential markets. Focus on sustainable technology.',
                userId: new mongoose.Types.ObjectId(),
                metadata: { industry: 'Energy', tags: ['Renewable', 'Sustainable'] }
            }
        ];

        console.log('📝 Storing sample embeddings...');
        const storedEmbeddings = [];

        for (const company of testCompanies) {
            try {
                const result = await vectorService.storeCompanyEmbedding(
                    company.name,
                    company.data,
                    company.userId,
                    company.metadata
                );
                storedEmbeddings.push(result);
                console.log(`✅ Stored embedding for ${company.name}`);
            } catch (error) {
                console.error(`❌ Failed to store embedding for ${company.name}:`, error.message);
            }
        }

        console.log(`\n📊 Stored ${storedEmbeddings.length} embeddings\n`);

        // Test similarity search
        const searchQueries = [
            'artificial intelligence software',
            'data analytics platform',
            'renewable energy solutions',
            'machine learning technology'
        ];

        console.log('🔍 Testing similarity searches...\n');

        for (const query of searchQueries) {
            try {
                console.log(`Search: "${query}"`);
                const results = await vectorService.searchSimilarCompanies(query, 3, 0.5);

                if (results.length > 0) {
                    results.forEach((result, index) => {
                        console.log(`  ${index + 1}. ${result.companyName} (similarity: ${result.similarityScore.toFixed(3)})`);
                    });
                } else {
                    console.log('  No similar companies found');
                }
                console.log('');
            } catch (error) {
                console.error(`❌ Search failed for "${query}":`, error.message);
            }
        }

        // Test recommendations
        if (storedEmbeddings.length > 0) {
            console.log('💡 Testing recommendations...');
            try {
                const userId = storedEmbeddings[0].userId;
                const recommendations = await vectorService.getCompanyRecommendations(userId, 3);

                if (recommendations.length > 0) {
                    console.log('Recommendations based on user history:');
                    recommendations.forEach((rec, index) => {
                        console.log(`  ${index + 1}. ${rec.companyName} (score: ${rec.similarityScore.toFixed(3)})`);
                    });
                } else {
                    console.log('No recommendations found');
                }
            } catch (error) {
                console.error('❌ Recommendations failed:', error.message);
            }
        }

        // Test search by company name
        console.log('\n🏢 Testing company name search...');
        try {
            const nameResults = await vectorService.searchByCompanyName('Tech');
            console.log(`Found ${nameResults.length} companies with 'Tech' in the name:`);
            nameResults.forEach((result, index) => {
                console.log(`  ${index + 1}. ${result.companyName}`);
            });
        } catch (error) {
            console.error('❌ Name search failed:', error.message);
        }

        // Test getting embeddings by user
        if (storedEmbeddings.length > 0) {
            console.log('\n👤 Testing user embeddings retrieval...');
            try {
                const userId = storedEmbeddings[0].userId;
                const userResults = await vectorService.getEmbeddingsByUser(userId, 10, 1);
                console.log(`Found ${userResults.embeddings.length} embeddings for user`);
            } catch (error) {
                console.error('❌ User embeddings retrieval failed:', error.message);
            }
        }

        console.log('\n✅ MongoDB vector search test completed!');

        // Cleanup option
        console.log('\n🧹 Cleaning up test data...');
        try {
            const CompanyEmbedding = mongoose.model('CompanyEmbedding');
            const deleteResult = await CompanyEmbedding.deleteMany({
                companyName: { $in: testCompanies.map(c => c.name) }
            });
            console.log(`🗑️ Deleted ${deleteResult.deletedCount} test embeddings`);
        } catch (error) {
            console.error('⚠️ Cleanup failed:', error.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);

        if (error.name === 'MongoNetworkError') {
            console.log('\n💡 It looks like MongoDB is not running.');
            console.log('Please start MongoDB and try again.');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Connection refused. Make sure MongoDB is running on the configured port.');
        }
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Performance test function
async function performanceTest() {
    console.log('⚡ Running MongoDB vector search performance test...\n');

    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clientiq', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const testQueries = [
            'technology startup',
            'healthcare solutions',
            'financial services',
            'e-commerce platform',
            'mobile app development'
        ];

        const startTime = Date.now();

        for (const query of testQueries) {
            const queryStart = Date.now();
            await vectorService.searchSimilarCompanies(query, 5, 0.6);
            const queryTime = Date.now() - queryStart;
            console.log(`Query "${query}": ${queryTime}ms`);
        }

        const totalTime = Date.now() - startTime;
        console.log(`\n⏱️ Total time: ${totalTime}ms`);
        console.log(`📊 Average per query: ${(totalTime / testQueries.length).toFixed(1)}ms`);

    } catch (error) {
        console.error('❌ Performance test failed:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--performance') || args.includes('-p')) {
        performanceTest();
    } else {
        testMongoVectorSearch();
    }
}

module.exports = { testMongoVectorSearch, performanceTest };
