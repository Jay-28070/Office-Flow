# Request Status Notification System

## Overview
The notification system shows users a popup when they log in if any of their requests have been approved or rejected since their last login.

## How It Works

### **Backend Components:**

1. **Last Login Tracking**: 
   - `POST /api/users/:userId/login` - Updates user's last login timestamp
   - Called automatically when user loads dashboard

2. **Notification Endpoint**:
   - `GET /api/users/:userId/notifications` - Returns request status changes since last login
   - Filters for requests with status 'Completed' or 'Rejected'
   - Only shows updates that occurred after user's last login

3. **Testing Endpoints**:
   - `POST /api/debug/create-test-request` - Creates a test request
   - `POST /api/debug/simulate-status-change` - Changes request status for testing

### **Frontend Components:**

1. **Authentication Check**: Verifies user is logged in before loading dashboard
2. **Notification Check**: Automatically checks for notifications on dashboard load
3. **Popup Modal**: Beautiful modal showing request status updates
4. **Styling**: Responsive design with success (green) and warning (yellow) themes

## Testing the Notification System

### **Method 1: Test with Sample Data (Instant)**
```javascript
// In browser console on user dashboard:
testNotifications()
```

### **Method 2: Test with Real API (Recommended)**
```javascript
// In browser console on user dashboard:
createAndTestNotification()
```
This will:
1. Create a real test request
2. Automatically approve it after 1 second
3. Check for notifications
4. Show the popup if everything works

### **Method 3: Manual Testing**
```javascript
// Check what's happening step by step:
forceCheckNotifications()  // Check current notifications
checkNotifications()       // Same as above with more logging
```

### **Method 4: Full Workflow Test**
1. Submit a request as a user
2. Log out
3. Have admin approve/reject the request  
4. Log back in as the user
5. Should see notification popup automatically

## Debugging

### **Check Browser Console**
Look for these debug messages:
- `=== CHECKING NOTIFICATIONS ===`
- `Token exists: true`
- `User ID: [user-id]`
- `Notifications data: [object]`

### **Check Server Logs**
Look for these debug messages:
- `=== NOTIFICATIONS API DEBUG ===`
- `Found requests: [number]`
- `Total notifications: [number]`

### **Common Issues & Solutions**

**Issue: No popup appears**
- Check browser console for errors
- Verify user is authenticated (`localStorage.getItem('authToken')`)
- Run `forceCheckNotifications()` to see debug info

**Issue: "No notifications" message**
- User might be logging in for first time
- No requests have been approved/rejected since last login
- Check server logs for request status changes

**Issue: Authentication errors**
- Verify user is logged in properly
- Check if `localStorage.getItem('user')` has valid data

## API Endpoints

### **Update Last Login**
```
POST /api/users/:userId/login
Authorization: Bearer <token>
```

### **Get Notifications**
```
GET /api/users/:userId/notifications
Authorization: Bearer <token>

Response:
{
  "success": true,
  "notifications": [
    {
      "id": "req123",
      "title": "IT Support Request",
      "category": "IT", 
      "status": "Completed",
      "message": "Your IT request has been approved!",
      "type": "success"
    }
  ],
  "count": 1,
  "debug": {
    "userId": "user123",
    "lastLoginAt": 1640995200,
    "totalRequests": 5,
    "notificationCount": 1
  }
}
```

### **Test Endpoints**
```
POST /api/debug/create-test-request
POST /api/debug/simulate-status-change
Body: { "requestId": "req123", "status": "Completed" }
```

## Features

- ✅ **Automatic Detection**: No user action required
- ✅ **Beautiful UI**: Professional modal design
- ✅ **Mobile Responsive**: Works on all devices
- ✅ **Multiple Notifications**: Shows all updates in one popup
- ✅ **Secure**: Users only see their own notifications
- ✅ **Performance**: Lightweight and fast
- ✅ **Debugging**: Comprehensive logging and test functions
- ✅ **Testing**: Multiple testing methods available

## Files Modified
- `backend/app.js`: Added notification endpoints and debugging
- `frontend/users/scripts/dashboard.js`: Added notification system with debugging
- `docs/NOTIFICATION_SYSTEM.md`: This documentation