# 🚀 HawkRoute Authentication Integration Guide

Complete guide to integrating the authentication system into HawkRoute.

---

## 📑 Table of Contents

1. [Quick Start](#quick-start)
2. [Backend Setup](#backend-setup)
3. [Frontend Integration](#frontend-integration)
4. [Protecting Routes](#protecting-routes)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB database running
- Redis (optional, for enhanced rate limiting)

### Installation

```bash
# Backend dependencies (already installed)
cd Backend
npm install

# Frontend dependencies
cd ../Frontend
npm install

# Environment variables are already configured
```

### Start the System

```bash
# Start backend (from Backend folder)
npm run dev

# Start frontend (from Frontend folder)
npm run dev
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Login Page: http://localhost:3000/login
- Register Page: http://localhost:3000/register

---

## 🔧 Backend Setup

### ✅ Files Created

All backend files are already created and integrated:

```
Backend/src/
├── models/
│   ├── User.js (Enhanced with auth fields)
│   └── ActivityLog.js (New - Activity tracking)
├── controllers/
│   └── authController.js (New - All auth logic)
├── routes/
│   └── authRoutes.js (New - Auth endpoints)
├── middleware/
│   ├── auth.js (Updated - Token validation)
│   └── rateLimiter.js (New - Brute force protection)
├── utils/
│   └── generateTokens.js (New - JWT utilities)
└── server.js (Updated - Added cookie-parser)
```

### Environment Variables

Add to `Backend/.env`:

```env
# JWT Secrets (Use strong secrets in production)
JWT_ACCESS_SECRET=hawkroute-access-secret-key-2024-change-this
JWT_REFRESH_SECRET=hawkroute-refresh-secret-key-2024-change-this

# Token Expiry
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# MongoDB (already configured)
MONGODB_URI=mongodb+srv://your-connection-string

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Environment
NODE_ENV=development
```

### Database Migration

The User model has been enhanced. If you have existing users, they need migration:

```javascript
// Run this script once: Backend/src/utils/migrateUsers.js
const User = require('./models/User');

async function migrateUsers() {
  const users = await User.find({});
  
  for (const user of users) {
    if (!user.email) {
      user.email = `${user.username}@hawkroute.mil`;
    }
    if (!user.name) {
      user.name = user.username;
    }
    if (!user.role || !['ADMIN', 'OPERATOR', 'FIELD_OFFICER'].includes(user.role)) {
      user.role = 'FIELD_OFFICER';
    }
    await user.save();
  }
  
  console.log('✅ User migration complete');
}
```

---

## 🎨 Frontend Integration

### ✅ Files Created

All frontend files are created:

```
Frontend/src/
├── context/
│   └── AuthContext.tsx (New - Global auth state)
├── components/
│   └── ProtectedRoute.tsx (New - Route protection)
├── app/
│   ├── layout.tsx (Updated - AuthProvider added)
│   ├── login/
│   │   └── page.tsx (New - Login UI)
│   └── register/
│       └── page.tsx (New - Registration UI)
```

### Environment Variables

Add to `Frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Using Authentication in Components

```tsx
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout, hasRole, hasPermission } = useAuth();

  // Check if user is logged in
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  // Check user role
  if (hasRole('ADMIN')) {
    return <AdminPanel />;
  }

  // Check permission
  if (hasPermission('WRITE_CONVOYS')) {
    return <button>Create Convoy</button>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## 🔒 Protecting Routes

### Method 1: Using ProtectedRoute Component

Wrap any page that requires authentication:

```tsx
// In your page component
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected Content</div>
    </ProtectedRoute>
  );
}
```

### Method 2: Role-Based Protection

```tsx
import { ProtectedRoute, AdminRoute, OperatorRoute } from '@/components/ProtectedRoute';

// Only admins can access
export default function AdminPage() {
  return (
    <AdminRoute>
      <div>Admin Only Content</div>
    </AdminRoute>
  );
}

// Admins and operators can access
export default function OperationsPage() {
  return (
    <OperatorRoute>
      <div>Operations Content</div>
    </OperatorRoute>
  );
}
```

### Method 3: Custom Protection

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function CustomPage() {
  return (
    <ProtectedRoute
      allowedRoles={['ADMIN', 'OPERATOR']}
      requiredPermissions={['WRITE_CONVOYS']}
      redirectTo="/unauthorized"
    >
      <div>Custom Protected Content</div>
    </ProtectedRoute>
  );
}
```

### Updating Dashboard Page

Your existing dashboard needs protection:

```tsx
// Frontend/src/app/dashboard/page.tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

const DashboardPage = () => {
  const { user, logout } = useAuth();

  // ...existing dashboard code...

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col bg-slateDepth text-textNeutral">
        {/* Add logout button to navigation */}
        <nav className="border-b border-panelNight/40 bg-panelNight/90 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-3">
            {/* ...existing nav... */}
            
            <div className="flex items-center gap-3">
              <div className="text-xs text-textNeutral/70">
                {user?.name} ({user?.role})
              </div>
              <button
                onClick={logout}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
        
        {/* ...rest of dashboard... */}
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Test Registration**
   ```
   1. Go to http://localhost:3000/register
   2. Fill in all required fields
   3. Select a role (Admin/Operator/Field Officer)
   4. Click "Create Account"
   5. Should redirect to dashboard
   ```

2. **Test Login**
   ```
   1. Go to http://localhost:3000/login
   2. Enter email and password
   3. Click "Sign In"
   4. Should redirect to dashboard
   ```

3. **Test Protected Routes**
   ```
   1. Logout
   2. Try to access http://localhost:3000/dashboard
   3. Should redirect to login
   ```

4. **Test Token Refresh**
   ```
   1. Login
   2. Wait 14+ minutes
   3. Make an API request
   4. Token should auto-refresh
   ```

5. **Test Role-Based Access**
   ```
   1. Login as FIELD_OFFICER
   2. Try to access admin routes
   3. Should show "Access Denied"
   ```

### API Testing with cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "role": "OPERATOR"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get current user (use token from login response)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt

# Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

### Testing Rate Limiting

```bash
# Try to login 6 times with wrong password
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nAttempt $i\n"
done

# Should get "Too many login attempts" error
```

---

## 🔍 Protecting Existing API Routes

### Add Authentication to Convoy Routes

```javascript
// Backend/src/routes/convoyRoutes.js
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');

// Protect all convoy routes
router.use(authMiddleware);

// Only authenticated users can view convoys
router.get('/', requirePermission(['READ_CONVOYS']), getConvoys);

// Only operators and admins can create convoys
router.post('/', requirePermission(['WRITE_CONVOYS']), createConvoy);

// Only admins can delete convoys
router.delete('/:id', requireRole(['ADMIN']), deleteConvoy);
```

### Update Frontend API Calls

```typescript
// Frontend/src/lib/api.ts

// Add token to all requests
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const api = {
  async getConvoys() {
    const response = await fetch(`${API_URL}/convoys`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    
    if (response.status === 401) {
      // Token expired, try to refresh
      await refreshToken();
      return this.getConvoys(); // Retry
    }
    
    return response.json();
  },
  
  // ...other methods...
};
```

---

## 🐛 Troubleshooting

### Issue: "No token provided" error

**Solution:**
- Check if AuthProvider wraps your app in layout.tsx
- Verify localStorage has 'accessToken'
- Check if Authorization header is being sent

### Issue: CORS errors

**Solution:**
```javascript
// Backend/src/server.js - Ensure credentials: true
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

```typescript
// Frontend - Always use credentials: 'include'
fetch(url, {
  credentials: 'include'
})
```

### Issue: Refresh token not working

**Solution:**
- Check if cookies are enabled in browser
- Verify cookie settings in backend (httpOnly, sameSite)
- In development, ensure sameSite is set to 'lax' or 'none'

### Issue: "Account locked" message

**Solution:**
- Wait 2 hours for automatic unlock
- Or manually reset in database:
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } }
)
```

### Issue: Token expires too quickly

**Solution:**
```javascript
// Backend/.env - Increase token lifetime
JWT_ACCESS_EXPIRY=30m  # Change from 15m

// Or adjust refresh interval in AuthContext
// Frontend/src/context/AuthContext.tsx
setInterval(() => {
  refreshToken();
}, 25 * 60 * 1000); // Refresh every 25 minutes
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Components (Next.js)                            │ │
│  │  - Login Page                                          │ │
│  │  - Register Page                                       │ │
│  │  - Protected Routes                                    │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │  AuthContext (Global State)                           │ │
│  │  - user, isAuthenticated, login(), logout()           │ │
│  │  - Auto token refresh every 14 minutes                │ │
│  │  - Access token in localStorage                       │ │
│  └────────────────┬───────────────────────────────────────┘ │
└───────────────────┼──────────────────────────────────────────┘
                    │ HTTP Requests
                    │ Authorization: Bearer <token>
                    │ credentials: 'include' (for cookies)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Auth Routes (/api/auth/*)                            │ │
│  │  - /register  - /login  - /logout                     │ │
│  │  - /refresh-token  - /me                              │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │  Auth Middleware                                       │ │
│  │  - Verify JWT access token                            │ │
│  │  - Check user roles & permissions                     │ │
│  │  - Rate limiting (brute force protection)             │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │  Auth Controller                                       │ │
│  │  - Business logic for auth operations                 │ │
│  │  - Generate tokens (access + refresh)                 │ │
│  │  - Hash passwords (bcrypt, 12 rounds)                 │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │  Database Models                                       │ │
│  │  - User (credentials, roles, refresh tokens)          │ │
│  │  - ActivityLog (audit trail)                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   MongoDB Database    │
         │  - users collection   │
         │  - activitylogs       │
         └──────────────────────┘

SECURITY FEATURES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ JWT Access Token (15 min) - Stored in localStorage
✓ JWT Refresh Token (7 days) - Stored in HttpOnly cookie
✓ Password Hashing - bcrypt with 12 rounds
✓ Account Locking - 5 failed attempts = 2 hour lock
✓ Rate Limiting - Prevents brute force attacks
✓ Activity Logging - Full audit trail
✓ Role-Based Access Control (RBAC)
✓ Permission-Based Access Control
✓ Secure Cookie Settings (HttpOnly, Secure, SameSite)
✓ Token Invalidation on Logout
```

---

## 🎯 Best Practices

### 1. Never Store Passwords in Plain Text
✅ Already handled - passwords are hashed with bcrypt

### 2. Use HTTPS in Production
```javascript
// Update for production
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  sameSite: 'strict',
};
```

### 3. Rotate JWT Secrets Regularly
```bash
# Generate new secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Monitor Activity Logs
```javascript
// Check for suspicious activity
const suspiciousActivity = await ActivityLog.find({
  action: 'LOGIN_FAILED',
  createdAt: { $gte: new Date(Date.now() - 3600000) }
}).count();

if (suspiciousActivity > 50) {
  // Alert admins
}
```

### 5. Implement Token Blacklisting (Advanced)
```javascript
// Store invalidated tokens in Redis
const blacklistToken = async (token) => {
  const redis = getRedisClient();
  const decoded = jwt.decode(token);
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
  
  await redis.set(`blacklist:${token}`, '1', 'EX', expiresIn);
};
```

---

## 🚀 Production Deployment

### Environment Variables for Production

```env
# Strong secrets (use 64+ character random strings)
JWT_ACCESS_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>

# Production MongoDB
MONGODB_URI=mongodb+srv://prod-connection-string

# Production CORS
CORS_ORIGINS=https://hawkroute.yourdomain.com

# Enable production features
NODE_ENV=production
```

### Security Checklist

- [ ] Change all default secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure secure cookies
- [ ] Set up rate limiting with Redis
- [ ] Enable MongoDB authentication
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerts
- [ ] Regular security audits
- [ ] Backup user database
- [ ] Document incident response plan

---

## 📚 Additional Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [API Documentation](./AUTHENTICATION_API.md)

---

## 🆘 Support

If you encounter issues:

1. Check this guide first
2. Review error logs: `Backend/logs/error.log`
3. Check activity logs: GET `/api/auth/activity-logs`
4. Create a GitHub issue with error details

**Version:** 1.0.0  
**Last Updated:** December 12, 2024

---

## ✅ Quick Verification

Run these commands to verify everything is working:

```bash
# 1. Backend is running
curl http://localhost:5000/health

# 2. Auth endpoints are accessible
curl http://localhost:5000/api/auth/me

# 3. Frontend is running
curl http://localhost:3000

# 4. Login page exists
curl http://localhost:3000/login

# 5. MongoDB is connected (check logs)
tail -f Backend/logs/combined.log | grep "MongoDB Connected"
```

**All authentication features are now fully integrated and ready to use!** 🎉