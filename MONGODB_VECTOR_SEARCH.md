# ClientIQ MongoDB Vector Search

This document explains the MongoDB-based vector search implementation for semantic company research and recommendations in ClientIQ.

## 🎯 What is Vector Search?

Vector search enables semantic similarity matching by converting text into high-dimensional vectors (embeddings) and comparing them using mathematical similarity measures. This allows for:

- **Semantic Search**: Find companies similar in meaning, not just keywords
- **Smart Recommendations**: Suggest companies based on user research patterns
- **Content Discovery**: Discover related companies even with different terminology

## 🛠️ MongoDB Setup

### 1. Local MongoDB Installation

No special setup required! The system works with standard MongoDB installations:

```bash
# Windows: Download from https://www.mongodb.com/try/download/community
# macOS: brew install mongodb-community
# Ubuntu: sudo apt install mongodb
```

### 2. Environment Configuration

Your `.env` file should contain:

```properties
MONGODB_URI=mongodb://localhost:27017/clientiq
EMBEDDING_MODEL=text-embedding-ada-002
VECTOR_DIMENSION=1536
```

### 3. No Additional Dependencies

The system uses:
- **OpenAI API** for generating embeddings
- **MongoDB** for storage with native JavaScript similarity calculations
- **Mongoose** for data modeling

## 📊 Data Schema

### CompanyEmbedding Model

```javascript
{
  companyName: String,      // Company name
  researchData: String,     // Full research text
  embedding: [Number],      // 1536-dimensional vector
  userId: ObjectId,         // Reference to user
  metadata: {
    industry: String,
    website: String,
    tags: [String]
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 API Endpoints

### Vector Search
Search for companies similar to a query:

```http
POST /api/company/vector-search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "AI-powered software companies",
  "limit": 5,
  "threshold": 0.7
}
```

### Get Recommendations
Get personalized company recommendations:

```http
GET /api/company/recommendations?limit=5
Authorization: Bearer <token>
```

### Store Embedding
Manually store company embeddings:

```http
POST /api/company/store-embedding
Authorization: Bearer <token>
Content-Type: application/json

{
  "companyName": "TechCorp AI",
  "researchData": "AI-powered software company...",
  "metadata": {
    "industry": "Technology",
    "tags": ["AI", "Enterprise"]
  }
}
```

### Get User Embeddings
Retrieve user's stored embeddings:

```http
GET /api/company/embeddings?page=1&limit=20
Authorization: Bearer <token>
```

### Search by Company Name
Search embeddings by company name:

```http
GET /api/company/search-embeddings?companyName=TechCorp
Authorization: Bearer <token>
```

## 🎯 How It Works

### 1. Automatic Embedding Generation
When research is generated:
```javascript
// 1. Combine research results
const researchText = `${overview} ${painPoints} ${pitch} ${insights}`;

// 2. Generate embedding via OpenAI
const embedding = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: researchText
});

// 3. Store in MongoDB
await CompanyEmbedding.create({
  companyName,
  researchData: researchText,
  embedding: embedding.data[0].embedding,
  userId,
  metadata
});
```

### 2. Similarity Search
Uses cosine similarity for vector comparison:
```javascript
cosineSimilarity(vectorA, vectorB) {
  const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
  const normA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}
```

### 3. Recommendation Algorithm
Analyzes user preferences:
```javascript
// 1. Get user's research history
const userEmbeddings = await CompanyEmbedding.find({ userId }).limit(10);

// 2. Create preference profile by averaging embeddings
const avgEmbedding = averageEmbeddings(userEmbeddings.map(e => e.embedding));

// 3. Find similar companies from other users
const recommendations = await findSimilar(avgEmbedding, { excludeUserId: userId });
```

## 🧪 Testing

### Run Tests
```bash
node test-mongo-vector.js
```

### Performance Testing
```bash
node test-mongo-vector.js --performance
```

The test script will:
- Create sample embeddings
- Test similarity searches
- Verify recommendations
- Measure performance
- Clean up test data

## 🔧 Configuration Options

### Similarity Thresholds
Adjust search sensitivity:
- `0.9+`: Very similar companies (near duplicates)
- `0.7-0.9`: Moderately similar (same industry/niche)
- `0.5-0.7`: Somewhat related (broader categories)
- `<0.5`: Distantly related

### Embedding Models
Currently supports OpenAI models:
- `text-embedding-ada-002`: 1536 dimensions (recommended)
- `text-embedding-3-small`: 1536 dimensions (newer, faster)
- `text-embedding-3-large`: 3072 dimensions (higher quality)

### Performance Tuning

#### Database Indexes
The system automatically creates indexes:
```javascript
// Compound index for user queries
{ companyName: 1, userId: 1 }

// Time-based queries
{ userId: 1, createdAt: -1 }
```

#### Memory Optimization
- Embeddings are excluded from list queries
- Pagination limits data transfer
- In-memory similarity calculation for reasonable dataset sizes

## 📈 Scaling Considerations

### For Larger Datasets (1000+ companies)
Consider upgrading to **MongoDB Atlas Vector Search** for production:

1. **MongoDB Atlas Setup**:
   - Use MongoDB Atlas cloud service
   - Enable Vector Search indexes
   - Use `$vectorSearch` aggregation pipeline

2. **Index Configuration**:
   ```javascript
   {
     "type": "vectorSearch",
     "definition": {
       "fields": [{
         "type": "vector",
         "path": "embedding",
         "numDimensions": 1536,
         "similarity": "cosine"
       }]
     }
   }
   ```

3. **Query Optimization**:
   ```javascript
   // MongoDB Atlas Vector Search query
   db.companyembeddings.aggregate([
     {
       "$vectorSearch": {
         "queryVector": embedding,
         "path": "embedding",
         "numCandidates": 100,
         "limit": 10,
         "index": "vector_index"
       }
     }
   ])
   ```

### Current Implementation Benefits
- **Simple Setup**: Works with any MongoDB installation
- **No Additional Infrastructure**: No vector databases required
- **Full Control**: Custom similarity algorithms and filtering
- **Cost Effective**: Uses existing MongoDB infrastructure

### When to Upgrade
Consider Atlas Vector Search when:
- Dataset exceeds 10,000 companies
- Search latency becomes > 1 second
- Need for advanced vector operations
- Requiring high-availability vector search

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   ```
   ❌ MongoNetworkError: connect ECONNREFUSED
   ```
   - Solution: Start MongoDB service
   - Check connection string in `.env`

2. **OpenAI API Issues**
   ```
   ❌ Failed to generate embedding
   ```
   - Solution: Verify `OPENAI_API_KEY` in `.env`
   - Check API quota and billing

3. **Out of Memory (Large Datasets)**
   ```
   ❌ JavaScript heap out of memory
   ```
   - Solution: Implement pagination in similarity search
   - Consider MongoDB Atlas Vector Search

4. **Slow Similarity Search**
   ```
   ⚠️ Search taking > 2 seconds
   ```
   - Solution: Reduce search limit or increase threshold
   - Add MongoDB indexes
   - Consider upgrading to Atlas Vector Search

### Performance Monitoring
```javascript
// Add timing to similarity searches
const startTime = Date.now();
const results = await vectorService.searchSimilarCompanies(query);
console.log(`Search took ${Date.now() - startTime}ms`);
```

## 🚀 Getting Started

1. **Ensure MongoDB is running**:
   ```bash
   # Check if MongoDB is running
   mongo --eval "db.adminCommand('ismaster')"
   ```

2. **Start your backend**:
   ```bash
   npm run dev
   ```

3. **Generate some research** to populate embeddings automatically

4. **Test vector search**:
   ```bash
   node test-mongo-vector.js
   ```

5. **Try the API endpoints** using your favorite API client

The system will automatically create embeddings for all new research and enable semantic search capabilities immediately!

## 💡 Tips for Best Results

- **Quality Input**: Better research text produces better embeddings
- **Diverse Data**: Include various industries and company types
- **Regular Cleanup**: Remove outdated or duplicate embeddings
- **Monitor Performance**: Track search times and adjust thresholds
- **User Feedback**: Allow users to rate recommendations for improvement
