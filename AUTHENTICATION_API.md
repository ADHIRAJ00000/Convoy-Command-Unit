# 🔐 HawkRoute Authentication API Documentation

Complete API reference for the HawkRoute authentication system.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

---

## 📋 Authentication Endpoints

### 1. Register New User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@mil.gov",
  "username": "johndoe",
  "password": "securePassword123",
  "role": "OPERATOR",
  "rank": "Captain",
  "unit": "Alpha-1"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "_id": "64abc123...",
      "name": "John Doe",
      "email": "john.doe@mil.gov",
      "username": "johndoe",
      "role": "OPERATOR",
      "permissions": ["READ_CONVOYS", "WRITE_CONVOYS", "OPTIMIZE_ROUTES"],
      "active": true,
      "createdAt": "2024-12-12T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Roles:**
- `ADMIN` - Full system access
- `OPERATOR` - Convoy monitoring & route optimization
- `FIELD_OFFICER` - Field operations & event management

**Rate Limit:** 3 requests per hour per IP

---

### 2. Login

**POST** `/auth/login`

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "john.doe@mil.gov",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64abc123...",
      "name": "John Doe",
      "email": "john.doe@mil.gov",
      "role": "OPERATOR",
      "permissions": ["READ_CONVOYS", "WRITE_CONVOYS"],
      "lastLogin": "2024-12-12T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies Set:**
- `refreshToken` (HttpOnly, Secure, 7 days)

**Error Responses:**
- `401` - Invalid credentials
- `423` - Account locked (too many failed attempts)
- `403` - Account deactivated

**Rate Limit:** 5 attempts per 15 minutes per IP

---

### 3. Logout

**POST** `/auth/logout`

Invalidate current session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 4. Refresh Access Token

**POST** `/auth/refresh-token`

Get new access token using refresh token.

**Cookies Required:**
- `refreshToken`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response:**
- `401` - Invalid or expired refresh token

---

### 5. Get Current User

**GET** `/auth/me`

Get authenticated user details.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "name": "John Doe",
    "email": "john.doe@mil.gov",
    "username": "johndoe",
    "role": "OPERATOR",
    "permissions": ["READ_CONVOYS", "WRITE_CONVOYS"],
    "rank": "Captain",
    "unit": "Alpha-1",
    "active": true,
    "lastLogin": "2024-12-12T10:00:00.000Z",
    "createdAt": "2024-12-12T08:00:00.000Z"
  }
}
```

---

### 6. Forgot Password

**POST** `/auth/forgot-password`

Request password reset token.

**Request Body:**
```json
{
  "email": "john.doe@mil.gov"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

**Rate Limit:** 3 requests per hour per IP

---

### 7. Reset Password

**POST** `/auth/reset-password/:token`

Reset password using token from email.

**URL Parameters:**
- `token` - Password reset token

**Request Body:**
```json
{
  "password": "newSecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successful. Please login with new password."
}
```

---

### 8. Get User Sessions (Admin Only)

**GET** `/auth/sessions/:userId`

View active sessions for a user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Required Role:** `ADMIN`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "64abc123...",
    "email": "john.doe@mil.gov",
    "activeSessions": [
      {
        "device": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1",
        "createdAt": "2024-12-12T10:00:00.000Z",
        "expiresAt": "2024-12-19T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 9. Get Activity Logs (Admin Only)

**GET** `/auth/activity-logs`

View authentication activity logs.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Required Role:** `ADMIN`

**Query Parameters:**
- `userId` (optional) - Filter by user ID
- `action` (optional) - Filter by action type
- `limit` (optional) - Results per page (default: 50)
- `page` (optional) - Page number (default: 1)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "64abc...",
        "userId": {
          "_id": "64def...",
          "name": "John Doe",
          "email": "john.doe@mil.gov"
        },
        "action": "LOGIN_SUCCESS",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "device": "Desktop",
        "status": "SUCCESS",
        "timestamp": "2024-12-12T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "pages": 3
    }
  }
}
```

**Action Types:**
- `LOGIN_SUCCESS`
- `LOGIN_FAILED`
- `LOGOUT`
- `REGISTER`
- `PASSWORD_CHANGE`
- `PASSWORD_RESET_REQUEST`
- `PASSWORD_RESET_SUCCESS`
- `TOKEN_REFRESH`
- `ACCOUNT_LOCKED`
- `UNAUTHORIZED_ACCESS`

---

## 🔒 Security Features

### Token Types

1. **Access Token**
   - Lifetime: 15 minutes
   - Storage: localStorage
   - Usage: API requests

2. **Refresh Token**
   - Lifetime: 7 days
   - Storage: HttpOnly cookie
   - Usage: Refresh access tokens

### Rate Limiting

- **Login:** 5 attempts per 15 minutes
- **Register:** 3 attempts per hour
- **Password Reset:** 3 attempts per hour
- **General API:** 100 requests per 15 minutes

### Account Locking

- Locks after 5 failed login attempts
- Lock duration: 2 hours
- Automatic unlock after duration

### Password Requirements

- Minimum length: 6 characters
- Hashed with bcrypt (12 rounds)
- Never returned in API responses

---

## 🎯 Role-Based Access Control

### Permission Matrix

| Permission | Admin | Operator | Field Officer |
|------------|-------|----------|---------------|
| READ_CONVOYS | ✅ | ✅ | ✅ |
| WRITE_CONVOYS | ✅ | ✅ | ❌ |
| OPTIMIZE_ROUTES | ✅ | ✅ | ❌ |
| MANAGE_EVENTS | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ❌ | ❌ |

---

## 📡 Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate user)
- `423` - Locked (account locked)
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🔧 Example Usage

### JavaScript/TypeScript

```typescript
// Login
const login = async (email: string, password: string) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (data.success) {
    // Store access token
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data.user;
  } else {
    throw new Error(data.error);
  }
};

// Make authenticated request
const getUser = async () => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:5000/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  return await response.json();
};

// Refresh token
const refreshAccessToken = async () => {
  const response = await fetch('http://localhost:5000/api/auth/refresh-token', {
    method: 'POST',
    credentials: 'include', // Sends refresh token cookie
  });

  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
  }
};
```

---

## 🌐 CORS Configuration

The API supports CORS with credentials. Frontend must use:

```javascript
fetch(url, {
  credentials: 'include'
})
```

---

## 📝 Notes

1. **Always use HTTPS in production**
2. **Refresh tokens are stored in HttpOnly cookies** - secure from XSS
3. **Access tokens are short-lived** - minimize security risk
4. **All activity is logged** - full audit trail
5. **Rate limiting prevents brute force** - automatic protection

---

## 🚀 Quick Start

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "password": "password123",
    "role": "OPERATOR"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Get current user
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

---

## 📞 Support

For issues or questions:
- Create an issue on GitHub
- Contact: dev@hawkroute.mil

**Version:** 1.0.0  
**Last Updated:** December 12, 2024