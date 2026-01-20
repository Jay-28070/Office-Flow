# Environment Setup Guide

## Overview

This guide explains how to properly configure environment variables for officeFlow to keep your credentials secure.

## Understanding Firebase Security

### Two Types of Credentials

1. **Service Account JSON** (Backend - CRITICAL SECRET)
   - Used by Node.js backend
   - Grants full admin access
   - MUST be kept secret
   - Located: `backend/firebase-service-account.json`

2. **Client API Keys** (Frontend - Public by Design)
   - Used by browser JavaScript
   - Visible to users (by design)
   - Security enforced by Firebase Rules
   - Located: `frontend/users/scripts/firebase-config.js`

## Setup Instructions

### 1. Backend Configuration

```bash
cd backend

# Copy example file
cp .env.example .env

# Edit .env with your values (optional - most config is in service account JSON)
nano .env
```

**Get Service Account JSON:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save as `backend/firebase-service-account.json`

### 2. Frontend Configuration

**Option A: Direct Configuration (Simple)**

Edit `frontend/users/scripts/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

**Get Firebase Config:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings > General
4. Scroll to "Your apps" section
5. Click on your web app (or create one)
6. Copy the config object

**Option B: Environment File (Advanced)**

For projects using a build tool (Vite, Webpack, etc.):

```bash
cd frontend
cp .env.example .env
# Edit .env with your Firebase config
```

### 3. Verify .gitignore

Ensure these files are NOT tracked by git:

```bash
# Check git status
git status

# Should NOT see:
# - backend/firebase-service-account.json
# - backend/.env
```

If you see these files, they're not properly ignored!

## Security Best Practices

### 1. Restrict API Keys

Even though client API keys are public, restrict them:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services > Credentials
3. Find your API key
4. Click "Edit"
5. Under "Application restrictions":
   - Select "HTTP referrers"
   - Add your domains:
     ```
     http://localhost:3000/*
     https://yourdomain.com/*
     ```

### 2. Configure Firestore Security Rules

In Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to get user data
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && 
                     (request.auth.uid == userId || 
                      getUserData().role in ['admin', 'superadmin']);
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Companies collection
    match /companies/{companyId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserData().role == 'superadmin';
    }
    
    // Leave requests
    match /leaveRequests/{requestId} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
                               getUserData().role in ['admin', 'superadmin'];
    }
    
    // Admin requests
    match /adminRequests/{requestId} {
      allow create: if isAuthenticated();
      allow read, update: if isAuthenticated() && getUserData().role == 'superadmin';
    }
  }
}
```

### 3. Enable Authentication Security

In Firebase Console > Authentication > Settings:

- ✅ Enable email enumeration protection
- ✅ Add authorized domains for production
- ✅ Configure password policy (min 6 characters)

## Environment Variables Reference

### Backend (.env)

```bash
# Server
PORT=3000
NODE_ENV=development

# Firebase (optional - mostly from service account JSON)
FIREBASE_PROJECT_ID=your-project-id

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Frontend (firebase-config.js)

```javascript
{
  apiKey: "AIzaSy...",              // Public - identifies your Firebase project
  authDomain: "project.firebaseapp.com",  // Public - auth domain
  projectId: "your-project-id",     // Public - project identifier
  storageBucket: "project.appspot.com",   // Public - storage bucket
  messagingSenderId: "123456789",   // Public - FCM sender ID
  appId: "1:123:web:abc"           // Public - app identifier
}
```

## Troubleshooting

### "Permission denied" errors
→ Check Firestore Security Rules

### "Invalid API key" errors
→ Verify firebase-config.js has correct values

### "Service account not found" errors
→ Ensure firebase-service-account.json exists in backend/

### CORS errors
→ Check backend CORS configuration and allowed origins

## Production Deployment

### Hosting Platforms

**Vercel / Netlify (Frontend):**
```bash
# Set environment variables in dashboard
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
# ... etc
```

**Heroku / Railway (Backend):**
```bash
# Set service account as environment variable
heroku config:set FIREBASE_SERVICE_ACCOUNT="$(cat firebase-service-account.json)"

# Or upload file directly (preferred)
# Add firebase-service-account.json to your deployment
```

**Docker:**
```dockerfile
# Use secrets for service account
COPY firebase-service-account.json /app/backend/
ENV NODE_ENV=production
```

## Quick Start Checklist

- [ ] Download Firebase service account JSON
- [ ] Place in `backend/firebase-service-account.json`
- [ ] Verify file is in .gitignore
- [ ] Get Firebase web config from console
- [ ] Update `frontend/users/scripts/firebase-config.js`
- [ ] Restrict API key in Google Cloud Console
- [ ] Configure Firestore Security Rules
- [ ] Test authentication flow
- [ ] Verify no secrets in git: `git status`

## Need Help?

- See [SECURITY.md](../SECURITY.md) for security guidelines
- See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md) for detailed Firebase setup
- Check [Firebase Documentation](https://firebase.google.com/docs)
