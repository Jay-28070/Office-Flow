# Setup Instructions for officeFlow

## Current Status ✅

Your project dependencies are installed and ready. However, you need to configure Firebase before starting the server.

## What You Need to Do

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **office-flow-2232d** (or create it if it doesn't exist)
3. Click the gear icon ⚙️ next to "Project Overview"
4. Go to "Project settings" → "Service accounts" tab
5. Click "Generate new private key"
6. Click "Generate key" - a JSON file will download
7. Rename the downloaded file to `firebase-service-account.json`
8. Move it to the `backend/` folder

### Step 2: Verify Firebase Configuration

Your frontend Firebase config is already set up with:
- Project ID: `office-flow-2232d`
- Auth Domain: `office-flow-2232d.firebaseapp.com`

Make sure this matches your Firebase project.

### Step 3: Enable Firebase Services

In Firebase Console:

1. **Enable Authentication:**
   - Go to Authentication → Get started
   - Enable "Email/Password" sign-in method

2. **Create Firestore Database:**
   - Go to Firestore Database → Create database
   - Start in "production mode"
   - Choose a location close to you

3. **Set Firestore Security Rules:**
   - Go to Firestore → Rules tab
   - Copy the rules from `FIREBASE_SETUP_GUIDE.md`
   - Click "Publish"

### Step 4: Start the Server

Once you have the `firebase-service-account.json` file in the `backend/` folder:

```bash
cd backend
node app.js
```

The server will start on `http://localhost:3000`

### Step 5: Test the Application

1. Open your browser to: `http://localhost:3000/users/pages/index.html`
2. Click "Get Started" or go to Register
3. Create a new company (this makes you a super admin)
4. Fill in all fields and submit
5. Login with your credentials
6. You should see the dashboard

## Quick Commands

```bash
# Start the server (from backend folder)
node app.js

# Test Firebase connection (after setup)
node utils/testFirebaseConnection.js

# Migrate existing data (if you have old data)
node utils/migrateToFirestore.js
```

## Troubleshooting

### "Cannot find module firebase-service-account.json"
→ You need to download the service account key from Firebase Console (see Step 1)

### "Invalid API key" in browser
→ Your frontend config doesn't match your Firebase project. Update `frontend/users/scripts/firebase-config.js`

### "Permission denied" errors
→ Set up Firestore security rules (see Step 3)

## File Structure

```
backend/
├── firebase-service-account.json          ← YOU NEED THIS FILE
├── firebase-service-account-TEMPLATE.json ← Template for reference
├── app.js                                 ← Main server file
├── config/
│   └── firebase.js                        ← Firebase initialization
└── package.json                           ← Dependencies (already installed ✅)

frontend/
└── users/
    └── scripts/
        └── firebase-config.js             ← Already configured ✅
```

## Next Steps

1. Download `firebase-service-account.json` from Firebase Console
2. Place it in the `backend/` folder
3. Run `node app.js` from the backend folder
4. Open `http://localhost:3000/users/pages/index.html` in your browser
5. Register and test the app

## Need More Help?

- **Detailed Setup:** See `FIREBASE_SETUP_GUIDE.md`
- **API Reference:** See `AUTHENTICATION_REFERENCE.md`
- **Quick Checklist:** See `QUICK_START.md`

---

**Note:** The `firebase-service-account.json` file contains sensitive credentials. It's already in `.gitignore` to keep it secure.
