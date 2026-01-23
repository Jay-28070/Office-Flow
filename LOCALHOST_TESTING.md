# 🏠 Localhost Testing Guide

## ✅ **Already Works Automatically!**

The app automatically detects when you're running on localhost and uses the local backend.

## 🚀 **How to Test Locally**

### 1. Start Backend
```bash
cd backend
npm start
```
Backend runs on: `http://localhost:3000`

### 2. Start Frontend
Use any of these methods:

**Option A: Live Server (VS Code)**
- Right-click `frontend/users/pages/dashboard.html`
- Select "Open with Live Server"
- Opens on: `http://localhost:5500` or similar

**Option B: Python Server**
```bash
cd frontend
python -m http.server 8000
```
Opens on: `http://localhost:8000`

**Option C: Node.js Server**
```bash
cd frontend
npx serve .
```

### 3. Access the App
- **Login**: `http://localhost:5500/users/pages/login.html`
- **Dashboard**: `http://localhost:5500/users/pages/dashboard.html`
- **Admin**: `http://localhost:5500/admin/pages/super_admin_dashboard.html`

## 🎯 **Emergency Localhost Override (For Presentations)**

If deployment fails and you need to present, you have **3 super easy options**:

### Option 1: URL Parameter (Instant)
Add `?localhost=true` to any URL:
```
https://yourdomain.com/dashboard.html?localhost=true
```
This forces localhost mode instantly!

### Option 2: Uncomment One Line
In `frontend/config/environment.js`, uncomment:
```javascript
const FORCE_LOCALHOST = true;  // Remove the // to activate
```

### Option 3: Browser Console Override
Open browser console and type:
```javascript
window.FORCE_LOCALHOST = true;
location.reload();
```

## 🔍 **Verify It's Working**

1. Open browser console
2. Look for these messages:
   ```
   🌍 Environment: development
   🔗 API Base URL: http://localhost:3000
   ```

3. Check network tab - all API calls should go to `localhost:3000`

## 🚨 **Presentation Day Backup Plan**

If deployment completely fails:

1. **Start local backend**: `cd backend && npm start`
2. **Open frontend** with Live Server
3. **Add `?localhost=true`** to the URL if needed
4. **Present locally** - works exactly the same!

---

**✅ Zero configuration needed - localhost testing works out of the box!**