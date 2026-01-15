# Firebase Authentication Setup Guide for officeFlow

This guide will help you integrate Firebase Authentication into your officeFlow project.

## Overview

Your project now uses Firebase for:
- **Password Encryption**: Handled automatically by Firebase Authentication
- **User Storage**: User profiles stored in Firestore
- **Login/Sessions**: Managed by Firebase Authentication
- **Security Tokens**: Firebase ID tokens for API authentication

## Prerequisites

1. A Google account
2. Node.js installed on your system
3. Your officeFlow project

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name (e.g., "officeFlow")
4. Follow the setup wizard (you can disable Google Analytics if not needed)
5. Click "Create project"

## Step 2: Enable Firebase Authentication

1. In your Firebase project, click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click on "Email/Password"
5. Enable "Email/Password" (first toggle)
6. Click "Save"

## Step 3: Create Firestore Database

1. In your Firebase project, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Select "Start in production mode" (we'll set up rules later)
4. Choose a location closest to your users
5. Click "Enable"

## Step 4: Set Up Firestore Security Rules

1. In Firestore Database, go to the "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
    }
    
    // Companies collection
    match /companies/{companyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }
    
    // Admin requests collection
    match /adminRequests/{requestId} {
      allow read, write: if request.auth != null;
    }
    
    // Leave requests collection
    match /leaveRequests/{requestId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Firebase Configuration

### For Frontend (Web App)

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app
5. Register your app with a nickname (e.g., "officeFlow Web")
6. Copy the `firebaseConfig` object

### For Backend (Admin SDK)

1. In Firebase Console, go to "Project settings" → "Service accounts" tab
2. Click "Generate new private key"
3. Click "Generate key" - a JSON file will download
4. Rename this file to `firebase-service-account.json`
5. Move it to `officeFlow/backend/` directory

⚠️ **IMPORTANT**: Add `firebase-service-account.json` to your `.gitignore` file to keep it secure!

## Step 6: Configure Frontend

1. Open `officeFlow/frontend/users/scripts/firebase-config.js`
2. Replace the placeholder config with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Step 7: Verify Backend Configuration

1. Ensure `firebase-service-account.json` is in `officeFlow/backend/`
2. The backend is already configured to use this file in `backend/config/firebase.js`

## Step 8: Start Your Application

1. Start the backend server:
```bash
cd officeFlow/backend
node app.js
```

2. Open your browser and navigate to:
```
http://localhost:3000/users/pages/index.html
```

## Step 9: Test the Integration

1. **Register a new user**:
   - Go to the registration page
   - Create a new company (this will make you a super admin)
   - Fill in all required fields
   - Submit the form

2. **Verify in Firebase Console**:
   - Go to Authentication → Users tab
   - You should see your new user
   - Go to Firestore Database
   - You should see collections: `users` and `companies`

3. **Test login**:
   - Go to the login page
   - Enter your credentials
   - You should be redirected to the dashboard

## Features Implemented

### Frontend
- ✅ Firebase Authentication integration
- ✅ User registration with Firebase
- ✅ User login with Firebase
- ✅ Password reset functionality
- ✅ Auth state management
- ✅ Automatic token refresh
- ✅ Proper error handling

### Backend
- ✅ Firebase Admin SDK integration
- ✅ Token verification middleware
- ✅ User profile management in Firestore
- ✅ Company management in Firestore
- ✅ Role-based access control
- ✅ Leave request management
- ✅ Admin request management

## Security Features

1. **Password Encryption**: Firebase handles password hashing with bcrypt and salting
2. **Secure Tokens**: Firebase ID tokens are JWT tokens signed by Google
3. **Token Expiration**: Tokens automatically expire after 1 hour
4. **Token Refresh**: Frontend automatically refreshes tokens
5. **HTTPS**: Firebase Authentication requires HTTPS in production
6. **Firestore Rules**: Database access controlled by security rules

## Migration from Local Storage

Your project previously stored user data in:
- `backend/db/database.json` (local file)
- `localStorage` (browser)

Now all data is stored in:
- **Firebase Authentication**: User credentials
- **Firestore**: User profiles, companies, requests
- **localStorage**: Only for temporary token storage

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Check that you've replaced the placeholder config in `firebase-config.js`

### "Firebase: Error (auth/network-request-failed)"
- Check your internet connection
- Verify Firebase project is active

### "User not found in database"
- The user exists in Firebase Auth but not in Firestore
- This can happen if registration was interrupted
- Delete the user from Firebase Auth and re-register

### CORS Errors
- Make sure your backend is running on `http://localhost:3000`
- Check that CORS is enabled in `app.js`

### "Permission denied" in Firestore
- Check your Firestore security rules
- Verify the user is authenticated
- Check that the user's role is correct

## Environment Variables (Optional)

For production, consider using environment variables:

Create `.env` file in `backend/`:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email
```

Update `backend/config/firebase.js` to use environment variables instead of the JSON file.

## Next Steps

1. **Email Verification**: Add email verification for new users
2. **Password Reset**: Implement password reset flow
3. **Multi-factor Authentication**: Add 2FA for enhanced security
4. **Session Management**: Implement session timeout and refresh
5. **Audit Logging**: Track authentication events

## Support

For Firebase-specific issues, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication Guide](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

---

**Note**: Keep your `firebase-service-account.json` file secure and never commit it to version control!
