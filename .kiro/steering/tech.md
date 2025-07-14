# Technology Stack

## Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom romantic theme colors
- **UI Components**: Radix UI primitives with custom components
- **State Management**: React Context (AuthContext, ChatContext)
- **Authentication**: Google OAuth with @react-oauth/google
- **Real-time**: Socket.io client
- **Charts**: Chart.js with react-chartjs-2
- **Animation**: Framer Motion
- **HTTP Client**: Axios

## Backend
- **Runtime**: Node.js (>=14.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Google OAuth
- **Real-time**: Socket.io
- **Security**: Helmet, CORS, bcryptjs, rate limiting
- **File Upload**: Multer
- **AI Integration**: Google Gemini 2.5 Flash API
- **CSV Processing**: csv-parser

## Development Tools
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js config
- **Testing**: Jest with Supertest (backend)
- **Process Management**: Nodemon for development

## Common Commands

### Frontend Development
```bash
npm run dev          # Start Next.js development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend Development
```bash
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start production server
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

### Full Stack Development
```bash
# Start both frontend and backend in development
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

## Environment Configuration
- Frontend: `.env.local` for Next.js environment variables
- Backend: `.env` for server configuration
- Required: GEMINI_API_KEY, DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID