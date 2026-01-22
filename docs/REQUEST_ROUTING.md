# Request Routing System

## Overview
Requests are automatically routed to the appropriate department admin based on the request category. If no department admin exists, requests are routed to the Super Admin as a fallback.

## Routing Rules

### Category to Department Mapping
- **Leave Requests** → HR Department Admin
- **IT Requests** → IT Department Admin  
- **Maintenance Requests** → Maintenance Department Admin
- **HR Requests** → HR Department Admin

### Fallback Strategy
If no admin exists for the target department:
1. System searches for department admin (e.g., "Head of HR")
2. If not found, routes to Super Admin
3. Super Admin can then reassign or handle the request

## Implementation

### Backend (`backend/app.js`)
```javascript
async function routeRequestToAdmin(category, companyId) {
    // Maps category to department
    // Finds admin for that department
    // Falls back to super admin if no department admin exists
}
```

### Request Creation
When a user submits a request:
1. Request is created with `assignedTo` field
2. `assignedTo` contains the admin user ID
3. Admin dashboard filters requests by `assignedTo`

## Recommendations for Missing Departments

### Option 1: Default Departments (Recommended)
When a company is created, automatically create these core departments:
- HR
- IT
- Maintenance

### Option 2: Super Admin Handles All
If departments don't exist, all requests go to Super Admin who can:
- Create the missing departments
- Promote employees to department admins
- Manually reassign requests

### Option 3: Flexible Routing
Allow Super Admin to configure routing rules:
- Map request categories to any department
- Set default handlers for unmapped categories
- Create custom categories

## Current Implementation
✅ Leave requests route to HR admin
✅ Fallback to Super Admin if no HR admin exists
✅ `assignedTo` field added to requests
⏳ Admin dashboard filtering by `assignedTo` (to be implemented)
⏳ IT and Maintenance request endpoints (to be created)

## User Promotion Flow
When a user is promoted to admin:
1. Backend updates user role and department
2. Frontend (user dashboard) monitors role changes via Firestore listener
3. User sees congratulations notification
4. Automatic redirect to admin dashboard after 2 seconds
5. Admin can now see requests assigned to their department
