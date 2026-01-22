# 🚀 Deployment Instructions

## Prerequisites
1. GitHub account
2. Render account (free tier works)

## Backend Deployment (Render)

### 1. Create Render Web Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `officeflow-backend` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend`

### 2. Add Environment Variables
In Render dashboard, add these environment variables:
- `NODE_ENV`: `production`
- Add any Firebase service account variables if needed

### 3. Note Your Backend URL
After deployment, Render will give you a URL like:
`https://officeflow-backend.onrender.com`

## Frontend Deployment (GitHub Pages)

### 1. Update Environment Config
Edit `frontend/config/environment.js`:
```javascript
API_BASE_URL: isProduction 
    ? 'https://YOUR-RENDER-APP-NAME.onrender.com'  // Replace with your actual Render URL
    : 'http://localhost:3000'
```

### 2. Update CORS in Backend
Edit `backend/app.js` CORS configuration:
```javascript
origin: [
    'https://YOUR-USERNAME.github.io',  // Replace with your GitHub Pages URL
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]
```

### 3. Enable GitHub Pages
1. Go to your GitHub repository
2. Settings → Pages
3. Source: "Deploy from a branch"
4. Branch: `main` or `master`
5. Folder: `/ (root)` or `/frontend` if you want to serve only frontend

### 4. Access Your App
Your app will be available at:
`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME`

## Testing Deployment

1. **Backend Health Check**: Visit `https://your-render-app.onrender.com/api/company/settings`
2. **Frontend**: Visit your GitHub Pages URL
3. **CORS**: Try logging in - should work without CORS errors

## Common Issues

### Backend Won't Start
- Check Render logs for errors
- Ensure `package.json` has `"start": "node app.js"`

### CORS Errors
- Verify GitHub Pages URL in backend CORS config
- Check browser console for exact error

### API Calls Fail
- Verify environment.js has correct Render URL
- Check network tab in browser dev tools

## Environment URLs

**Development:**
- Frontend: `http://localhost:5500` (Live Server)
- Backend: `http://localhost:3000`

**Production:**
- Frontend: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME`
- Backend: `https://YOUR-RENDER-APP.onrender.com`

---

✅ **The app is now deployment-ready!** Just update the URLs in the config files with your actual deployment URLs.