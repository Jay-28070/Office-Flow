# Security Guide for officeFlow

## 🔐 Critical Security Information

### What MUST Be Kept Secret

#### 1. **Firebase Service Account JSON** (CRITICAL ⚠️)
- **File**: `backend/firebase-service-account.json`
- **Contains**: Private keys that grant FULL admin access to your Firebase project
- **Risk if exposed**: Complete database access, ability to delete all data, impersonate users
- **Protection**: 
  - ✅ Already in `.gitignore`
  - ✅ Never commit to version control
  - ✅ Never share publicly
  - ✅ Rotate immediately if exposed

### What Can Be Public (But Should Be Protected)

#### 2. **Firebase Client API Keys**
- **File**: `frontend/users/scripts/firebase-config.js`
- **Contains**: `apiKey`, `authDomain`, `projectId`, etc.
- **Risk if exposed**: Minimal - these are designed to be public
- **Why it's okay**: Security is enforced by Firebase Security Rules, not by hiding the API key
- **Best practices**:
  - ✅ Restrict API key in Google Cloud Console to your domains
  - ✅ Set up proper Firestore Security Rules
  - ✅ Don't commit to public repos (best practice, but not critical)

## 🛡️ Security Checklist

### Firebase Console Setup

1. **Restrict API Key Usage**
   ```
   Google Cloud Console > APIs & Services > Credentials
   → Select your API key
   → Application restrictions: HTTP referrers
   → Add: https://yourdomain.com/*
   ```

2. **Firestore Security Rules** (CRITICAL)
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can only read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Only admins can read company data
       match /companies/{companyId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
       }
       
       // Users can create requests, admins can manage them
       match /leaveRequests/{requestId} {
         allow create: if request.auth != null;
         allow read: if request.auth != null;
         allow update, delete: if request.auth != null && 
                                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
       }
     }
   }
   ```

3. **Firebase Authentication Settings**
   ```
   Firebase Console > Authentication > Settings
   → Authorized domains: Add your production domain
   → Email enumeration protection: Enable
   ```

### Environment Setup

1. **Backend Environment Variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Frontend Configuration**
   ```bash
   cd frontend
   # Edit users/scripts/firebase-config.js with your Firebase config
   ```

### Git Security

1. **Verify .gitignore**
   ```bash
   # Check what's being tracked
   git status
   
   # If firebase-service-account.json appears, STOP!
   # Remove it from git history:
   git rm --cached backend/firebase-service-account.json
   git commit -m "Remove sensitive file"
   ```

2. **If You Accidentally Committed Secrets**
   - **Service Account JSON**: 
     1. Delete the service account in Firebase Console
     2. Create a new one
     3. Update your backend
   - **API Keys**: 
     1. Restrict in Google Cloud Console
     2. Optionally regenerate (not critical)

## 🚨 What To Do If Keys Are Exposed

### If Service Account JSON is Exposed:
1. **Immediately** go to Firebase Console > Project Settings > Service Accounts
2. Delete the compromised service account
3. Create a new service account
4. Download new JSON file
5. Update your backend
6. Review Firebase logs for suspicious activity

### If Client API Key is Exposed:
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Restrict the API key to your domains only
3. Review Firebase Authentication logs
4. Optionally create a new Web app in Firebase Console

## 📋 Production Deployment Checklist

- [ ] Service account JSON is NOT in version control
- [ ] API keys are restricted to production domains
- [ ] Firestore Security Rules are properly configured
- [ ] Firebase Authentication has authorized domains set
- [ ] CORS is configured correctly in backend
- [ ] Environment variables are set on hosting platform
- [ ] HTTPS is enabled (required for Firebase Auth)
- [ ] Regular security audits are scheduled

## 🔗 Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)

## 📞 Security Contact

If you discover a security vulnerability, please:
1. Do NOT open a public issue
2. Contact the project maintainer directly
3. Allow time for the issue to be fixed before disclosure
