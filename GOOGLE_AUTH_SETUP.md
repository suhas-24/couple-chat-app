# Google OAuth Setup Guide

This guide will help you set up Google OAuth for the Couple Chat App.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Couple Chat App")
5. Click "Create"

### 2. Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and then click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields:
     - App name: "Couple Chat"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if in development

### 4. Configure OAuth Client

1. After consent screen setup, create OAuth client ID:
   - Application type: "Web application"
   - Name: "Couple Chat Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production URL (when deploying)
   - Click "Create"

### 5. Copy Client ID

1. Copy the generated Client ID
2. You'll see it in a popup after creation
3. You can also find it later in the credentials list

### 6. Configure the Application

#### Frontend (.env.local)

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
```

#### Backend (.env)

Create a `.env` file in the backend directory:

```env
# Copy all content from .env.example and update these:
GOOGLE_CLIENT_ID=your-google-client-id-here
JWT_SECRET=generate-a-random-secret-here
DATABASE_URL=mongodb://localhost:27017/couple-chat
```

### 7. Start the Application

1. Install dependencies:
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   npm install
   ```

2. Start MongoDB (if running locally)

3. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

4. Start the frontend:
   ```bash
   npm run dev
   ```

5. Visit http://localhost:3000 and sign in with Google!

## Production Deployment

When deploying to production:

1. Add your production URL to Authorized JavaScript origins in Google Console
2. Update environment variables on your hosting platform
3. Ensure your production URL uses HTTPS

## Troubleshooting

### "Failed to fetch" error
- Check if backend is running on port 5000
- Verify CORS settings in backend
- Check browser console for specific errors

### Google Sign-In not working
- Verify Client ID is correct in both frontend and backend
- Check Authorized JavaScript origins includes your current URL
- Ensure you're not using Client Secret (not needed for web flow)

### User not persisting after refresh
- Check localStorage in browser DevTools
- Verify JWT token is being saved
- Check AuthContext implementation

## Security Notes

- Never commit `.env` files to version control
- Keep your Client ID secure (though it's public-facing)
- Use strong JWT secrets in production
- Enable HTTPS in production
