const mongoose = require('mongoose');

const researchSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        maxlength: [200, 'Company name cannot exceed 200 characters']
    },
    companyWebsite: {
        type: String,
        trim: true
    },
    industry: {
        type: String,
        trim: true
    },
    results: {
        overview: {
            type: String,
            required: true
        },
        companyDetails: {
            industry: String,
            sector: String,
            companySize: String,
            employees: String,
            headquarters: String,
            location: String,
            founded: String,
            revenue: String,
            businessModel: String,
            offerings: String,
            recentNews: String,
            marketPosition: String
        },
        contactInfo: {
            website: String,
            emails: [String],
            phones: [String],
            linkedin: String,
            twitter: String,
            facebook: String,
            youtube: String,
            instagram: String,
            address: String,
            generalEmail: String,
            salesEmail: String,
            supportEmail: String,
            mediaEmail: String
        },
        painPoints: [{
            type: String,
            trim: true
        }],
        pitch: {
            type: String,
            required: true
        },
        decisionMakers: [{
            type: String,
            trim: true
        }],
        additionalInsights: {
            type: String
        },
        technologies: [{
            type: String,
            trim: true
        }]
    },
    aiModel: {
        type: String,
        default: 'gpt-3.5-turbo'
    },
    promptUsed: {
        type: String
    },
    isSaved: {
        type: Boolean,
        default: false
    },
    tags: [{
        type: String,
        trim: true
    }],
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true
});

researchSchema.index({ userId: 1, createdAt: -1 });
researchSchema.index({ companyName: 'text' });
researchSchema.index({ 'results.overview': 'text', 'results.pitch': 'text' });

researchSchema.statics.getUserHistory = function (userId, limit = 10) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-promptUsed -__v');
};

researchSchema.statics.searchUserResearch = function (userId, searchTerm) {
    return this.find({
        userId,
        $or: [
            { companyName: { $regex: searchTerm, $options: 'i' } },
            { 'results.overview': { $regex: searchTerm, $options: 'i' } },
            { 'results.pitch': { $regex: searchTerm, $options: 'i' } },
            { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
    }).sort({ createdAt: -1 });
};

researchSchema.methods.toggleSave = function () {
    this.isSaved = !this.isSaved;
    return this.save();
};

const Research = mongoose.model('Research', researchSchema);

module.exports = Research;
