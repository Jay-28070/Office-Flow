# officeFlow

**officeFlow** is a web-based application that automates internal service requests and task management within a company. Employees can submit IT, HR, or maintenance requests, track their status, and view leave balances. Admins manage department-specific requests, assign tasks to staff, and review staff profiles. Super Admins can create and assign admin accounts, including department heads, ensuring secure role-based access.

Built with **HTML, CSS, JavaScript, Node.js, Express**, and **Firebase** for authentication and cloud data storage.

---

## 🔥 Firebase Authentication Integrated!

This project now uses **Firebase Authentication** for secure user management:

- ✅ **Password Encryption**: Automatic bcrypt hashing by Firebase
- ✅ **User Storage**: Cloud-based Firestore database
- ✅ **Login/Sessions**: Firebase Authentication with secure tokens
- ✅ **Security Tokens**: JWT tokens signed by Google
- ✅ **Password Reset**: Built-in password recovery
- ✅ **Cloud Backup**: Automatic data backup and scaling

### 🚀 Quick Setup

1. **Read the setup guide**: See `QUICK_START.md` for a quick checklist
2. **Detailed instructions**: See `FIREBASE_SETUP_GUIDE.md` for step-by-step setup
3. **API Reference**: See `AUTHENTICATION_REFERENCE.md` for code examples

---

## Features

- **User Dashboard**
  - Submit IT, HR, or maintenance service requests
  - Track request status
  - View leave balance and leave history
  - Secure authentication with Firebase

- **Admin Dashboard**
  - View requests only for their department
  - Assign tasks to staff based on job titles
  - Staff profile overview (brief details)
  - Manage staff and monitor tasks
  - Role-based access control

- **Super Admin Dashboard**
  - Create and assign admin accounts
  - Assign department heads and roles
  - Full access to all users and requests
  - Company settings management

- **Profile & Settings**
  - Update personal details
  - Change password via Firebase
  - Responsive UI for desktop and mobile

- **Modern UI**
  - Web-app style navigation
  - Smooth animations and transitions
  - Mobile-friendly with hamburger menu

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Firebase SDK
- **Backend:** Node.js, Express, Firebase Admin SDK
- **Database:** Firebase Firestore (Cloud NoSQL)
- **Authentication:** Firebase Authentication
- **Security:** JWT tokens, Firestore security rules

---

## Installation

### Prerequisites
- Node.js (v14 or higher)
- Firebase account
- npm or yarn

### Backend Setup

1. **Install dependencies**
```bash
cd backend
npm install
```

2. **Configure Firebase**
   - Follow `FIREBASE_SETUP_GUIDE.md` for detailed instructions
   - Place `firebase-service-account.json` in `backend/` folder
   - Update `frontend/users/scripts/firebase-config.js` with your Firebase config

3. **Start server**
```bash
node app.js
```

Server will run on `http://localhost:3000`

### Frontend Setup

1. **Update Firebase configuration**
   - Open `frontend/users/scripts/firebase-config.js`
   - Replace placeholder values with your Firebase project config

2. **Access the application**
   - Open browser and navigate to `http://localhost:3000/users/pages/index.html`

---

## Migration from Local Storage

If you have existing data in `backend/db/database.json`, you can migrate it to Firestore:

```bash
cd backend
node utils/migrateToFirestore.js
```

**Note**: Migrated users will need to reset their passwords using the "Forgot Password" feature.

---

## Project Structure

```
officeFlow/
├── backend/
│   ├── config/
│   │   └── firebase.js              # Firebase Admin initialization
│   ├── routes/
│   │   └── auth.js                  # Authentication routes
│   ├── utils/
│   │   ├── auth.js                  # Auth middleware
│   │   └── migrateToFirestore.js    # Migration script
│   ├── app.js                       # Main server file
│   ├── firebase-service-account.json # Firebase credentials (not in git)
│   └── package.json
├── frontend/
│   ├── admin/
│   │   ├── pages/                   # Admin dashboards
│   │   ├── scripts/                 # Admin JavaScript
│   │   └── styles/                  # Admin CSS
│   └── users/
│       ├── pages/                   # User pages (login, register, dashboard)
│       ├── scripts/
│       │   ├── firebase-config.js   # Firebase client config
│       │   └── script.js            # Auth logic
│       └── styles/                  # User CSS
├── FIREBASE_SETUP_GUIDE.md          # Detailed Firebase setup
├── AUTHENTICATION_REFERENCE.md      # API and code reference
├── QUICK_START.md                   # Quick setup checklist
└── README.md                        # This file
```

---

## Documentation

- **`QUICK_START.md`** - Quick setup checklist
- **`FIREBASE_SETUP_GUIDE.md`** - Step-by-step Firebase setup
- **`AUTHENTICATION_REFERENCE.md`** - API reference and code examples

---

## Security Features

- 🔒 Passwords encrypted with bcrypt (handled by Firebase)
- 🔑 JWT tokens signed by Google
- 🛡️ Firestore security rules for data access
- 👥 Role-based access control (User, Admin, Super Admin)
- 🔄 Automatic token refresh
- ⏱️ Token expiration (1 hour)
- 🚫 CORS protection
- 📝 Audit logging ready

---

## User Roles

### User (Default)
- Submit and track own requests
- View own leave balance
- Request admin role

### Admin
- All user permissions
- View and manage department requests
- Approve/reject leave requests
- View company users

### Super Admin
- All admin permissions
- Create/delete users
- Manage admin requests
- Update company settings
- Assign roles

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/user-data` - Get user profile

### Admin Management
- `POST /api/request-admin` - Request admin role
- `GET /api/admin-requests` - Get pending requests
- `POST /api/admin-requests/:id/approve` - Approve request
- `POST /api/create-admin` - Create admin directly

### Company Management
- `GET /api/company/settings` - Get company settings
- `PUT /api/company/settings` - Update settings
- `GET /api/company/users` - Get all users
- `PUT /api/users/:id/role` - Update user role

### Leave Requests
- `POST /api/leave-requests` - Create request
- `GET /api/leave-requests` - Get requests
- `POST /api/leave-requests/:id/approve` - Approve
- `POST /api/leave-requests/:id/reject` - Reject

See `AUTHENTICATION_REFERENCE.md` for detailed API documentation.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## License

This project is licensed under the MIT License.

---

## Support

For issues or questions:
1. Check the documentation files
2. Review Firebase Console for errors
3. Check browser and server console logs
4. Refer to Firebase documentation

---

**Built with ❤️ for efficient office management**
