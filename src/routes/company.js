const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/companyController');

const { authenticate, requirePremium } = require('../middleware/auth');
const {
    validateCompanyResearch,
    validateSaveResearch,
    validateAlternativePitch,
    validateSearch,
    validateObjectId,
    sanitizeInput
} = require('../middleware/validation');

router.use(authenticate);

router.post('/research',
    sanitizeInput,
    validateCompanyResearch,
    generateResearch
);

router.get('/history', getHistory);

router.get('/search',
    validateSearch,
    searchResearch
);

router.get('/saved', getSavedResearch);

router.get('/research/:id',
    validateObjectId('id'),
    getResearchById
);

router.put('/research/:id/save',
    validateObjectId('id'),
    sanitizeInput,
    validateSaveResearch,
    toggleSaveResearch
);

router.delete('/research/:id',
    validateObjectId('id'),
    deleteResearch
);

router.post('/research/:id/alternative-pitch',
    validateObjectId('id'),
    sanitizeInput,
    validateAlternativePitch,
    requirePremium,
    generateAlternative
);

router.post('/vector-search',
    sanitizeInput,
    vectorSearch
);

router.get('/recommendations', getRecommendations);

router.post('/store-embedding',
    sanitizeInput,
    storeEmbedding
);

router.get('/embeddings', getUserEmbeddings);

router.get('/search-embeddings', searchEmbeddings);

module.exports = router;
