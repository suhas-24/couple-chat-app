# Project Structure

## Root Level Organization
```
couple-chat-app/
├── src/                    # Frontend Next.js application
├── backend/                # Express.js API server
├── docs/                   # Static documentation build
├── public/                 # Static assets
├── config/                 # Configuration files
├── tests/                  # Test files
└── .kiro/                  # Kiro AI assistant configuration
```

## Frontend Structure (`src/`)
```
src/
├── components/             # Reusable React components
│   ├── auth/              # Authentication components (LoginForm, SignupForm)
│   ├── chat/              # Chat-related components (ChatWindow, AIChatBot)
│   ├── analytics/         # Analytics dashboard components
│   └── ui/                # Base UI components (Button, Card, MessageBubble)
├── pages/                 # Next.js pages (routing)
├── context/               # React Context providers (AuthContext, ChatContext)
├── services/              # API services and external integrations
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── styles/                # Global CSS and Tailwind styles
└── config/                # Frontend configuration (OAuth, etc.)
```

## Backend Structure (`backend/`)
```
backend/
├── controllers/           # Route handlers and business logic
├── models/               # Mongoose schemas (User, Chat, Message)
├── routes/               # Express route definitions
├── middleware/           # Custom middleware (auth, rate limiting)
├── services/             # Business services (AI, encryption, socket)
├── uploads/              # File upload storage
└── app.js               # Main Express application
```

## Key Architectural Patterns

### Component Organization
- **Feature-based grouping**: Components organized by domain (auth, chat, analytics)
- **UI component separation**: Base UI components in dedicated `ui/` folder
- **Context providers**: Centralized state management with React Context

### Backend Architecture
- **MVC pattern**: Controllers handle requests, Models define data, Routes define endpoints
- **Service layer**: Business logic separated into services (AI, encryption, socket management)
- **Middleware chain**: Authentication, rate limiting, and security middleware

### File Naming Conventions
- **React components**: PascalCase (e.g., `ChatWindow.tsx`, `LoginForm.tsx`)
- **Pages**: lowercase (e.g., `chat.tsx`, `analytics.tsx`)
- **Services/utilities**: camelCase (e.g., `socketService.ts`, `geminiService.js`)
- **Backend files**: camelCase (e.g., `authController.js`, `rateLimiter.js`)

### Import Patterns
- **Absolute imports**: Use `@/` alias for src directory imports
- **Relative imports**: For closely related files in same directory
- **Barrel exports**: Index files for clean imports from directories

### Environment Configuration
- **Frontend**: `.env.local` for Next.js variables
- **Backend**: `.env` for server configuration
- **Examples**: `.env.example` files provide templates