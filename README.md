# ClientIQ Backend

AI-powered B2B company research tool backend built with Node.js, Express, and MongoDB.

## Features

- 🔐 **Secure Authentication**: JWT-based user authentication with password hashing
- 🤖 **AI-Powered Research**: Integration with OpenAI API for company analysis
- 📊 **Company Insights**: Generate company overviews, pain points, and custom pitches
- 💾 **Research History**: Store and manage research results
- 🔍 **Search & Filter**: Search through saved research and history
- ⭐ **Save & Rating**: Save favorite research with ratings and notes
- 🎯 **Alternative Pitches**: Generate different pitch angles (Premium feature)
- 🛡️ **Security**: Rate limiting, input validation, and XSS protection

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **AI Integration**: OpenAI API
- **Security**: Helmet, bcryptjs, express-validator
- **Development**: Nodemon

## Project Structure

```
backend/
├── src/
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Authentication, validation, security
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API route definitions
│   ├── services/          # External service integrations
│   ├── utils/             # Helper functions
│   └── server.js          # Main server file
├── .env.example           # Environment variables template
└── package.json           # Dependencies and scripts
```

## Setup Instructions

### 1. Environment Setup

Copy the environment template and configure:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/clientiq
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key
```

### 2. Database Setup

Make sure MongoDB is installed and running:
- **Local MongoDB**: Install from [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- **MongoDB Atlas**: Use cloud database at [MongoDB Atlas](https://www.mongodb.com/atlas)

### 3. OpenAI API Setup

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Generate an API key
3. Add the key to your `.env` file

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Server

**Development mode** (with auto-restart):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - Logout user

### Company Research
- `POST /api/company/research` - Generate company research
- `GET /api/company/history` - Get research history
- `GET /api/company/search` - Search research
- `GET /api/company/saved` - Get saved research
- `GET /api/company/research/:id` - Get specific research
- `PUT /api/company/research/:id/save` - Save/unsave research
- `DELETE /api/company/research/:id` - Delete research
- `POST /api/company/research/:id/alternative-pitch` - Generate alternative pitch (Premium)

### Health Check
- `GET /api/health` - Server health status

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15 minutes per IP address
- Adjust in `src/server.js` if needed

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": ["Additional error details if applicable"]
}
```

## Development

### Running in Development

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

### Environment Variables

Required environment variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `OPENAI_API_KEY` - OpenAI API key for AI research

Optional environment variables:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `OPENAI_MODEL` - OpenAI model to use (default: gpt-3.5-turbo)

### Database Models

**User Model**:
- Authentication and profile information
- Research history and saved pitches
- Role-based access (basic/premium)

**Research Model**:
- Company research results
- AI-generated insights
- User ratings and notes

## Deployment

### Environment Variables for Production

Make sure to set secure values for:
- `JWT_SECRET` (use a long, random string)
- `MONGODB_URI` (use MongoDB Atlas or secure MongoDB instance)
- `NODE_ENV=production`
- `FRONTEND_URL` (your frontend domain)

### Recommended Hosting

- **Backend**: Render, Railway, or Heroku
- **Database**: MongoDB Atlas
- **Environment**: Node.js 18+ recommended

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- Input validation and sanitization
- XSS protection with Helmet
- CORS configuration
- MongoDB injection prevention

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
