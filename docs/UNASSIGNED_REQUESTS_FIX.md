# Unassigned Requests Fix - Firestore Index Issue Resolution

## Problem
The application was failing with Firestore index errors when trying to query requests with compound filters and ordering.

## Root Cause
Firestore requires composite indexes for queries that combine:
- Multiple `where()` clauses 
- `orderBy()` clauses
- Different field combinations

## Solution Applied

### **Backend Changes:**
1. **Removed Problematic orderBy Clauses**: Eliminated `orderBy('dateSubmitted', 'desc')` from Firestore queries
2. **Simplified Queries**: Used single-field queries where possible
3. **JavaScript Sorting**: Moved sorting logic to JavaScript after fetching data
4. **Enhanced Debugging**: Added comprehensive logging for troubleshooting

### **Fixed Endpoints:**
- `/api/requests` - Now sorts in JavaScript instead of Firestore
- `/api/leave-requests` - Removed orderBy, sorts client-side
- `/api/requests/unassigned` - Simplified to single companyId filter
- `/api/company/settings` - Added debug logging

### **Key Changes:**
```javascript
// OLD (Required Index)
.where('companyId', '==', companyId)
.where('status', '==', 'Pending')
.orderBy('dateSubmitted', 'desc')

// NEW (No Index Required)
.where('companyId', '==', companyId)
// Then filter and sort in JavaScript
```

## Testing the Fix

### **1. Backend Debug Commands (Browser Console):**
```javascript
// Test unassigned requests
debugUnassignedRequests()

// Create test request
createTestRequest()
```

### **2. Check Server Logs:**
- Look for "=== UNASSIGNED REQUESTS DEBUG ===" messages
- Verify request routing decisions
- Check company settings loading

### **3. Expected Behavior:**
- ✅ No more Firestore index errors
- ✅ Company settings load properly
- ✅ Unassigned requests tab works
- ✅ Requests route to super admin when no department admin exists

## Files Modified
- `backend/app.js`: Fixed all Firestore queries
- `frontend/admin/scripts/super_admin_dashboard.js`: Enhanced error handling
- `docs/UNASSIGNED_REQUESTS_FIX.md`: Updated documentation