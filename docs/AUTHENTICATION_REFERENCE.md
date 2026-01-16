# Authentication Reference - officeFlow

Quick reference guide for authentication implementation in officeFlow.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │         │   Backend API    │         │   Firebase      │
│   (Browser)     │────────▶│   (Express.js)   │────────▶│   (Cloud)       │
│                 │         │                  │         │                 │
│ - Firebase SDK  │         │ - Firebase Admin │         │ - Auth          │
│ - Auth UI       │         │ - Token Verify   │         │ - Firestore     │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

## Authentication Flow

### Registration Flow
1. User fills registration form
2. Frontend creates user in Firebase Auth (`createUserWithEmailAndPassword`)
3. Frontend gets Firebase ID token
4. Frontend sends user data + token to backend `/api/auth/register`
5. Backend verifies token
6. Backend creates user profile in Firestore
7. User is redirected to login

### Login Flow
1. User enters credentials
2. Frontend authenticates with Firebase (`signInWithEmailAndPassword`)
3. Frontend gets Firebase ID token
4. Frontend fetches user data from backend `/api/auth/user-data`
5. Backend verifies token and returns user profile
6. Token stored in localStorage
7. User redirected to dashboard

### API Request Flow
1. Frontend includes token in Authorization header
2. Backend middleware verifies Firebase token
3. Backend fetches user data from Firestore
4. Request proceeds with authenticated user context

## Code Examples

### Frontend: Login
```javascript
import { signInWithEmailAndPassword } from './firebase-config.js';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Use token for API calls
const response = await fetch('/api/auth/user-data', {
    headers: { 'Authorization': `Bearer ${idToken}` }
});
```

### Frontend: Register
```javascript
import { createUserWithEmailAndPassword, updateProfile } from './firebase-config.js';

const userCredential = await createUserWithEmailAndPassword(auth, email, password);
await updateProfile(userCredential.user, { displayName: fullName });

const idToken = await userCredential.user.getIdToken();

// Send to backend
await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fullName, email, firebaseUid, companyCode })
});
```

### Backend: Verify Token
```javascript
const { admin } = require('./config/firebase');

async function authenticateFirebaseToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;
    
    const userDoc = await admin.firestore()
        .collection('users')
        .doc(decodedToken.uid)
        .get();
    
    req.user = { userId: decodedToken.uid, ...userDoc.data() };
    next();
}
```

### Backend: Create User
```javascript
// Create in Firebase Auth
const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: fullName
});

// Create profile in Firestore
await db.collection('users').doc(userRecord.uid).set({
    email,
    fullName,
    role: 'user',
    companyId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
});
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/user-data` - Get authenticated user data

### Admin Requests
- `POST /api/request-admin` - Request admin role
- `GET /api/admin-requests` - Get pending requests (super admin)
- `POST /api/admin-requests/:id/approve` - Approve request (super admin)
- `POST /api/admin-requests/:id/reject` - Reject request (super admin)
- `POST /api/create-admin` - Create admin directly (super admin)

### Company Management
- `GET /api/company/settings` - Get company settings
- `PUT /api/company/settings` - Update settings (super admin)
- `GET /api/company/users` - Get all company users (admin)
- `PUT /api/users/:id/role` - Update user role (super admin)
- `DELETE /api/users/:id` - Delete user (super admin)

### Leave Requests
- `POST /api/leave-requests` - Create leave request
- `GET /api/leave-requests` - Get leave requests
- `POST /api/leave-requests/:id/approve` - Approve request (admin)
- `POST /api/leave-requests/:id/reject` - Reject request (admin)

## Security Features

### Password Security
- ✅ Passwords hashed with bcrypt by Firebase
- ✅ Minimum 6 characters enforced
- ✅ Passwords never stored in plain text
- ✅ Passwords never sent to backend

### Token Security
- ✅ JWT tokens signed by Google
- ✅ Tokens expire after 1 hour
- ✅ Automatic token refresh
- ✅ Tokens verified on every request
- ✅ Tokens include user ID and email

### Database Security
- ✅ Firestore security rules
- ✅ Role-based access control
- ✅ User can only access own data
- ✅ Admins can access company data
- ✅ Super admins have full access

## User Roles

### User (Default)
- View own profile
- Submit leave requests
- View own requests
- Request admin role

### Admin
- All user permissions
- View all company users
- Approve/reject leave requests
- View company settings

### Super Admin
- All admin permissions
- Create/delete users
- Manage admin requests
- Update company settings
- Assign roles

## Data Storage

### Firebase Authentication
- User credentials (email, password)
- User UID (unique identifier)
- Display name
- Email verification status

### Firestore Collections

#### users
```javascript
{
    email: string,
    fullName: string,
    role: 'user' | 'admin' | 'superadmin',
    jobTitle: string,
    department: string,
    companyId: string,
    leaveBalance: {
        annual: number,
        sick: number,
        personal: number,
        emergency: number
    },
    createdAt: timestamp
}
```

#### companies
```javascript
{
    name: string,
    companyCode: string,
    settings: {
        annualLeaveBalance: number,
        sickLeaveBalance: number,
        personalLeaveBalance: number,
        emergencyLeaveBalance: number,
        departments: string[],
        jobTitles: object
    },
    createdAt: timestamp
}
```

#### adminRequests
```javascript
{
    userId: string,
    userName: string,
    userEmail: string,
    companyId: string,
    status: 'pending' | 'approved' | 'rejected',
    createdAt: timestamp,
    approvedAt?: timestamp,
    rejectedAt?: timestamp
}
```

#### leaveRequests
```javascript
{
    userId: string,
    userName: string,
    userEmail: string,
    companyId: string,
    title: string,
    description: string,
    priority: string,
    category: string,
    type: string,
    leave: object,
    deduct: boolean,
    status: 'Pending' | 'Approved' | 'Rejected',
    dateSubmitted: timestamp,
    lastUpdated: timestamp,
    approvedAt?: timestamp,
    rejectedAt?: timestamp
}
```

## Common Tasks

### Add New Protected Route
```javascript
app.get('/api/my-route', authenticateFirebaseToken, async (req, res) => {
    // req.user contains authenticated user data
    // req.firebaseUser contains Firebase token data
});
```

### Require Admin Access
```javascript
app.post('/api/admin-only', authenticateFirebaseToken, requireAdmin, async (req, res) => {
    // Only admins and super admins can access
});
```

### Require Super Admin Access
```javascript
app.delete('/api/super-admin-only', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    // Only super admins can access
});
```

### Get Current User in Frontend
```javascript
import { onAuthStateChanged } from './firebase-config.js';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const idToken = await user.getIdToken();
        // User is signed in
    } else {
        // User is signed out
    }
});
```

### Logout User
```javascript
import { signOut } from './firebase-config.js';

await signOut(auth);
localStorage.removeItem('authToken');
localStorage.removeItem('user');
window.location.href = 'login.html';
```

## Error Handling

### Common Firebase Auth Errors
- `auth/email-already-in-use` - Email already registered
- `auth/invalid-email` - Invalid email format
- `auth/weak-password` - Password too weak
- `auth/user-not-found` - User doesn't exist
- `auth/wrong-password` - Incorrect password
- `auth/too-many-requests` - Too many failed attempts
- `auth/network-request-failed` - Network error

### Common Backend Errors
- `401 Unauthorized` - No token provided
- `403 Forbidden` - Invalid token or insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Testing

### Test Registration
```bash
# Should create user in Firebase Auth and Firestore
curl -X POST http://localhost:3000/api/auth/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","firebaseUid":"abc123","companyCode":"TEST1234"}'
```

### Test Login
```bash
# Should return user data
curl -X GET http://localhost:3000/api/auth/user-data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Token Expired
- Frontend automatically refreshes tokens
- If manual refresh needed: `await user.getIdToken(true)`

### User Not Found
- Check if user exists in Firebase Auth
- Check if user profile exists in Firestore
- Verify UID matches between Auth and Firestore

### Permission Denied
- Check Firestore security rules
- Verify user role in Firestore
- Ensure token is valid and not expired

### CORS Issues
- Verify backend CORS configuration
- Check allowed origins
- Ensure credentials are included in requests

## Best Practices

1. **Always verify tokens on backend** - Never trust client-side authentication
2. **Use HTTPS in production** - Firebase requires HTTPS for security
3. **Implement token refresh** - Tokens expire after 1 hour
4. **Handle errors gracefully** - Provide user-friendly error messages
5. **Log authentication events** - Track login attempts and failures
6. **Implement rate limiting** - Prevent brute force attacks
7. **Use environment variables** - Keep credentials secure
8. **Regular security audits** - Review Firestore rules and access patterns

## Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [JWT Tokens](https://jwt.io/)
