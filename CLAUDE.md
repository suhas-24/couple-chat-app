# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend (Next.js)
- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Backend (Express.js)
- `cd backend && npm run dev` - Start backend development server with nodemon
- `cd backend && npm start` - Start production backend server
- `cd backend && npm test` - Run Jest test suite with coverage
- `cd backend && npm run test:watch` - Run tests in watch mode

### Static Export Configuration
The project is configured for static export to GitHub Pages with basePath '/couple-chat-app'. The build outputs to 'out' directory.

## Architecture Overview

### Frontend (src/)
- **Next.js 14** with TypeScript and Tailwind CSS
- **Component Structure**: 
  - `components/auth/` - Login/signup forms with Google OAuth
  - `components/chat/` - Chat windows, AI assistant, CSV upload functionality
  - `components/analytics/` - Chat analytics dashboard
  - `components/ui/` - Reusable UI components (shadcn/ui style)
- **State Management**: React Context (AuthContext, ChatContext)
- **Styling**: Tailwind CSS with custom components using class-variance-authority

### Backend (backend/)
- **Express.js** with MongoDB/Mongoose
- **Authentication**: JWT tokens with Google OAuth integration
- **Controllers**: Separate controllers for auth, chat, AI, and analytics
- **Services**: Gemini AI integration and context-aware AI features
- **File Upload**: Multer for CSV chat import functionality

### Key Integrations
- **Google Gemini 2.5 Flash API** for AI-powered chat features
- **Google OAuth** for authentication
- **CSV Processing** for importing chat history from other platforms
- **Chart.js** for analytics visualization

### Data Models
- **User**: Authentication and profile data
- **Chat**: Chat room/conversation container
- **Message**: Individual messages with AI context support

## Development Notes

### Environment Setup
Backend requires `.env` file with:
- `GEMINI_API_KEY` for AI features
- `DATABASE_URL` for MongoDB connection
- `JWT_SECRET` for authentication
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for OAuth

### Testing
- Backend uses Jest for testing with supertest for API testing
- Frontend uses Next.js built-in ESLint configuration

### Deployment
- Frontend builds to static export for GitHub Pages deployment
- Backend designed for separate deployment (likely Node.js hosting)
- Cross-origin headers configured for separate frontend/backend deployment

### Special Features
- **Tanglish Support**: Handles Tamil-English mixed language conversations
- **CSV Chat Import**: Users can upload chat history from other platforms
- **AI Context Awareness**: Gemini integration provides relationship insights and conversation suggestions
- **Analytics Dashboard**: Visualizes chat patterns and relationship metrics