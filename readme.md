# ThinkBot Backend – Secure & Scalable Node.js API (In Active Development)

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-brightgreen)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-v4.18%2B-000000?style=flat&logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-Live-E14329?style=flat&logo=redis)](https://redis.io)
[![Status](https://img.shields.io/badge/Status-Active%20Development-blueviolet)]()

A **production-ready secure backend API** built with **Node.js + Express**, featuring enterprise-grade authentication, Redis-backed sessions, and a **full instructor → admin course review & publishing workflow**.

Currently in **active development**, built with scalability, security, and clean architecture in mind.

---

## Key Highlights

- JWT Authentication + Redis Refresh Tokens (secure & revocable)
- Role-Based Access Control (Admin / Instructor / Student)
- Instructor Course Draft → Review → Publish lifecycle
- Admin-moderated, versioned course review system
- Cloudinary-based video upload & management
- Email notifications for critical workflows
- Smart rate limiting (per IP + per email)
- NoSQL Injection & XSS protection
- Clean MVC architecture with Joi validation
- Redis-powered session invalidation on logout / block

---

## Core Features (Implemented)

| Feature | Status | Details |
|------|------|------|
| Secure Signup / Login / Logout | ✅ Done | JWT access + Redis refresh tokens |
| Email Verification | ✅ Done | Verification link on signup |
| Forgot & Reset Password | ✅ Done | Rate-limited + expiring reset tokens |
| Refresh Token Endpoint | ✅ Done | Issues new access token from Redis |
| Role-Based Route Protection | ✅ Done | Admin / Instructor / Student |
| User Blocking (Permanent / Temporary) | ✅ Done | Admin-only, blocks login & refresh |
| Unblock Request System | ✅ Done | User → Admin review → Approve / Reject |
| Rate Limiting (IP + Email) | ✅ Done | Prevents brute-force & bot signups |
| Security Hardening | ✅ Done | Helmet, mongo-sanitize, XSS, bcrypt |
| Redis Session Invalidation | ✅ Done | Logout / block instantly revokes tokens |

---

## Instructor Course Management (Implemented)

| Feature | Status | Details |
|------|------|------|
| Create Course (Draft Mode) | ✅ Done | Minimal required fields |
| Update Course Metadata | ✅ Done | Title, description, price, tags |
| Add Modules | ✅ Done | Dynamic module creation |
| Delete Modules | ✅ Done | Safe removal with reordering |
| Upload Videos | ✅ Done | Cloudinary-based uploads |
| Delete Videos | ✅ Done | DB + Cloudinary cleanup |
| Reorder Modules | ✅ Done | Order persistence |
| Reorder Videos | ✅ Done | Maintains correct sequence |
| Auto Duration Calculation | ✅ Done | Derived from video lengths |

---

## Course Review & Publishing Workflow (Implemented)

### Instructor Flow
1. Instructor creates a course in **draft**
2. Adds modules and videos incrementally
3. Submits course for review
4. Validation rules:
   - At least **one module**
   - Each module must contain **at least one video**
5. Course state transition:
   - Course status changed from **draft to review**
7. A **versioned course review request** is created

### Admin Flow
1. Admin reviews the submitted course
2. Possible actions:
- ✅ **Approve** → course becomes `published`
- ❌ **Reject** → course reverts to `draft`
3. Review metadata stored:
- Decision (approved / rejected)
- Feedback
- Reviewer (admin)
- Reviewed timestamp
4. Instructor receives **email notification**

### Review Guarantees
- Only **one pending review request per course**
- Review requests are **versioned**
- MongoDB **transactions** ensure atomic updates
- **Idempotent** admin review actions
- Emails sent **after successful DB commit**

---

## Email Notifications (Implemented)

- Instructor email verification
- Course review approval / rejection
- Professional HTML email templates
- Non-blocking async dispatch

---

## Database Relationship Architecture

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
 USER ||--o{ COURSE : creates
 USER ||--o{ ENROLLMENT : enrolls
 USER ||--o{ COURSE_REVIEW : writes
 USER ||--o{ COURSE_REVIEW_REQUEST : submits
 USER ||--o{ UNBLOCK_REQUEST : requests
 USER ||--o{ INSTRUCTOR_VERIFICATION : applies

 COURSE ||--o{ MODULE : contains
 MODULE ||--o{ VIDEO : contains

 COURSE ||--o{ COURSE_REVIEW : receives
 COURSE ||--o{ COURSE_REVIEW_REQUEST : reviewed_for
 COURSE ||--o{ ENROLLMENT : has

 COURSE_REVIEW_REQUEST }o--|| USER : reviewed_by

```

## Folder Structure

```bash
thinkbot-backend/
├── config/           # MongoDB, Redis, Cloudinary configuration
├── controllers/      # Route controllers (business logic)
├── middleware/       # Auth, RBAC, rate limiting, guards
├── models/           # Mongoose schemas & indexes
├── routes/           # Express route definitions
├── services/         # Email, token, external services
├── validation/       # Joi request validation schemas
├── utils/            # Shared helper utilities
├── .env              # Environment variables (ignored in git)
├── server.js         # Application entry point
├── package.json      # Dependencies & scripts
└── README.md         # Project documentation

```

## Environment Variables

### Server
PORT=5000

### MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/thinkbot

### Redis
REDIS_URL=redis://default:your_redis_password@redis-host:12345

### JWT Secrets
ACCESS_TOKEN=your_super_strong_access_token_secret
REFRESH_TOKEN=your_even_stronger_refresh_token_secret
JWT_SECRET=fallback_strong_secret

### Email (SMTP / Nodemailer)
EMAIL_USER=thinkbot.noreply@gmail.com
EMAIL_PASSWORD=your_app_password

### Frontend
FRONTEND_URL=https://thinkbot-yourapp.vercel.app

### FRONTEND_URL
http://localhost:3000
