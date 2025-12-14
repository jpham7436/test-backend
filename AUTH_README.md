# Authentication & Roles Documentation

## 🎭 User Roles

The system now supports two user roles:

1. **`user`** (Default)
   - Can search and view jobs
   - Can save jobs to favorites
   - Can apply to jobs
   - **Cannot** create, update, or delete users

2. **`company`**
   - Has all `user` capabilities
   - **Can post new jobs**
   - **Can edit their own jobs**
   - **Can delete their own jobs**

## 🔐 Auth Endpoints

### 1. Signup with Role
**POST** `/api/auth/signup`

```json
{
  "email": "hr@google.com",
  "password": "password123",
  "name": "Google HR",
  "role": "company"  // Optional (defaults to "user")
}
```

### 2. Login
**POST** `/api/auth/login`

Returns token containing the user's role.
```json
{
  "email": "hr@google.com",
  "password": "password123"
}
```

### 3. Get Current User
**GET** `/api/auth/me`

Returns user info including role.
```json
{
  "ok": true,
  "user": {
    "id": "user_123...",
    "email": "hr@google.com",
    "role": "company"
  }
}
```

## 💼 Job Management (Company Only)

All these endpoints require a valid token with `role: "company"`.

### 1. Post a Job
**POST** `/api/jobs`

```json
{
  "title": "Senior React Dev",
  "company": "Google",
  "location": "Remote",
  "salary": "$150k"
}
```

### 2. Update a Job
**PUT** `/api/jobs/:id`

Only the company who posted the job can edit it.
```json
{
  "salary": "$160k",
  "title": "Staff React Dev"
}
```

### 3. Delete a Job
**DELETE** `/api/jobs/:id`

Only the company who posted the job can delete it.

---

## 🚫 Error Responses

- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Valid token but insufficient permissions (e.g. `user` tries to post job)
