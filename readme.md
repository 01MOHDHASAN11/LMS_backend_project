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
- Cloudinary-based media upload (videos, thumbnails, resumes) with signed frontend uploads

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

## Authentication Flow

1. User logs in and receives:
   - Short-lived JWT access token
   - Long-lived refresh token stored in Redis
2. Access token is used for protected routes
3. When access token expires:
   - Client calls refresh endpoint
   - Backend validates refresh token from Redis
   - Issues a new access token
4. On logout or admin block:
   - Refresh token is deleted from Redis
   - Session is invalidated immediately

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
## Background Jobs & Queue Processing (BullMQ + Redis)

To ensure **fast API responses** and **non-blocking workflows**, the backend uses **BullMQ with Redis** for background job processing.

### Why BullMQ?
- Prevents slow API responses caused by email sending
- Improves scalability under high traffic
- Ensures retries & fault tolerance
- Decouples critical business logic from IO-heavy tasks

---

## Key Design Decisions

- Redis-backed refresh tokens for instant logout and user blocking
- Frontend-direct Cloudinary uploads to avoid backend file streaming
- Single BullMQ worker to prevent duplicate email processing
- Incremental course rating calculation to avoid heavy aggregations
- Draft → Review → Publish workflow mirroring real LMS moderation systems


### Email Background Processing

All email-related tasks are processed **asynchronously** using a **single BullMQ queue** (`email-queue`) and **one worker** with a switch-case strategy.

### Email Delivery Architecture

All emails are sent via **Brevo REST API** (not SMTP) to ensure reliable delivery on cloud hosting platforms.

**Why Brevo API?**
- ✅ Avoids SMTP port blocking on platforms like Render
- ✅ Better deliverability & sender reputation
- ✅ HTTPS-based communication (more reliable & secure)
- ✅ Built-in retry mechanisms & detailed delivery logs

**Migration Note:** Initially used nodemailer with SMTP, but migrated to `@getbrevo/brevo` REST API due to SMTP timeout issues on Render (ports 587/465 blocked).

#### Supported Background Email Jobs
- Signup email verification
- Forgot password email
- Admin unblock response email
- Course review approval / rejection email
- Instructor verification status email

#### Design Decisions
- **Single queue + single worker**
  - Avoids race conditions and duplicate processing
  - Prevents runtime issues caused by multiple workers on the same queue
- **Switch-case job handling**
  - Each email type is identified by `job.name`
- **Retries & backoff**
  - Failed jobs retry automatically with exponential backoff
- **Clean Redis memory**
  - Successful jobs are removed from Redis
  - Failed jobs can be routed to a Dead Letter Queue (DLQ)

---


### Queue Architecture Overview

| Queue Name | Purpose |
|-----------|--------|
| `email-queue` | All background email notifications |


---

### Worker Execution

Workers run independently from the API server:

```bash
npm run worker
```
---
## Frontend-Direct File Upload Architecture (Cloudinary Signed Uploads)

To improve **security, scalability, and API performance**, all media uploads are handled
**directly from the frontend to Cloudinary** using **signed uploads**.

### Why This Approach?
- Prevents large file uploads from blocking the API
- Reduces backend memory & CPU usage
- Ensures secure, permission-scoped uploads
- Avoids exposing Cloudinary secret keys

---

### Upload Flow (Resume & Course Thumbnail)

1. **Frontend requests a signed upload signature**
   - Backend validates user role (Instructor-only)
   - Backend generates a short-lived Cloudinary signature
   - Signature is scoped to a user-specific folder

2. **Frontend uploads file directly to Cloudinary**
   - Uses returned signature, timestamp, and API key
   - No backend file streaming involved

3. **Frontend sends Cloudinary response to backend**
   - `secure_url`
   - `public_id`
   - `bytes`
   - `resource_type`

4. **Backend validates upload metadata**
   - File type validation (image / pdf)
   - Size limits enforced
   - Folder ownership verification
   - Resource type validation

5. **Backend persists validated data to database**

---

### Security Guarantees

- Upload signatures are:
  - Short-lived
  - Role-protected
  - Folder-scoped per user
- Backend **never trusts frontend input blindly**
- Ownership is verified using `public_id` prefix checks
- Unauthorized uploads are automatically deleted from Cloudinary

---
## Student Course Consumption & Progress Tracking (Implemented)

## Student Reviews & Ratings (Implemented)

The platform supports a **robust, transaction-safe course review and rating system**
for enrolled students only.

### Review Rules & Guarantees

| Rule | Enforcement |
|----|----|
| Only enrolled students can review | Enrollment validation |
| One review per student per course | Unique `(student, course)` constraint |
| Rating range | 1 to 5 enforced at API level |
| Review update allowed | Existing review can be edited |
| Atomic updates | MongoDB transactions |
| Race-condition safe | Single transaction per operation |

---

### Rating Calculation Strategy

- Uses **incremental average update** (no aggregation queries)
- Prevents expensive re-calculation on every request
- Handles both **new review** and **review update** cases

**New Review**

**Update Review**

The platform supports **secure course consumption** for enrolled students with
**signed video streaming** and **robust progress tracking**.


### Enrollment & Access Control

| Feature | Status | Details |
|------|------|------|
| Course Enrollment Validation | ✅ Done | Only enrolled students can access content |
| Published Course Guard | ✅ Done | Draft / review courses blocked |
| Role-based Access | ✅ Done | Student-only video access routes |
| Course Enrollment | ✅ Done | Students can enroll before consuming or reviewing |

---

### Course Details for Students

| Feature | Status | Details |
|------|------|------|
| Get Course Details (Enrolled) | ✅ Done | Full module + video metadata |
| Get Course Details (Not Enrolled) | ✅ Done | Preview mode (no video URLs) |
| Instructor Info | ✅ Done | Instructor name via populate |
| Video URL Protection | ✅ Done | Video URLs never exposed directly |

---

### Secure Video Playback

| Feature | Status | Details |
|------|------|------|
| Signed Cloudinary URLs | ✅ Done | Short-lived, secure access |
| Expiry-based Streaming | ✅ Done | URLs expire automatically |
| Re-fetch on Expiry | ✅ Done | Frontend requests fresh URL |
| No Backend Streaming | ✅ Done | CDN handles buffering & seeking |

**Security Guarantees**
- Video URLs are **never stored in frontend**
- URLs are **time-limited**
- Only enrolled users can request playback

---

### Video Progress Tracking

| Feature | Status | Details |
|------|------|------|
| Per-video Progress Tracking | ✅ Done | Watched seconds stored |
| Anti-cheat Protection | ✅ Done | Progress never decreases |
| Completion Threshold | ✅ Done | 90% watched = completed |
| Resume Playback | ✅ Done | Continue from last timestamp |
| Periodic Sync | ✅ Done | Progress saved every few seconds |

---

### Course Progress Calculation

| Feature | Status | Details |
|------|------|------|
| Overall Course Progress | ✅ Done | Based on completed videos |
| Real-time Progress Update | ✅ Done | Recalculated on each save |
| Course Completion Flag | ✅ Done | `isCompleted = true` at 100% |
| Multi-module Support | ✅ Done | All modules counted |

---

### Enrollment Data Model Enhancements

| Field | Purpose |
|----|----|
| `videoProgress[]` | Tracks per-video progress |
| `watchedSeconds` | Resume playback |
| `completed` | Video completion status |
| `lastWatchedAt` | Analytics & resume |
| `progress` | Overall course progress |
| `isCompleted` | Course completion flag |

---

### Data Integrity & Performance

- Prevents backward progress manipulation
- Uses MongoDB subdocuments for locality
- Calculates progress against total videos in course
- Minimal DB writes via incremental updates
- Stateless video delivery via CDN

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
> Enrollment is a prerequisite for:
> - Course content access
> - Video playback
> - Writing or updating course reviews

## Known Limitations & Future Improvements

- Payment gateway integration not implemented
- Instructor revenue analytics not implemented
- Admin dashboard UI not included (API-only project)
- Search relevance can be improved with weighted indexes

## Tech Stack

**Core Framework**
- Node.js + Express.js

**Database & Caching**
- MongoDB Atlas (Mongoose ODM)
- Redis (Session management & BullMQ)

**Authentication & Security**
- JWT (jsonwebtoken)
- bcryptjs (password hashing)
- helmet, express-mongo-sanitize, express-xss-sanitizer, hpp

**Background Jobs**
- BullMQ + Redis

**Email Service**
- Brevo API (`@getbrevo/brevo`)

**File Storage**
- Cloudinary (videos, images, PDFs)

**Rate Limiting**
- rate-limiter-flexible

---

## Folder Structure

```bash
thinkbot-backend/
├── config/           # MongoDB, Redis, Cloudinary configuration
├── controllers/      # Route controllers (business logic)
├── middleware/       # Auth, RBAC, rate limiting, guards
├── models/           # Mongoose schemas & indexes
├── queues/           # Queue and workers
├── routes/           # Express route definitions
├── services/         # Track student course progress
├── validation/       # Joi request validation schemas
├── utils/            # Shared helper utilities
├── .env              # Environment variables (ignored in git)
├── server.js         # Application entry point
├── package.json      # Dependencies & scripts
└── README.md         # Project documentation

```

---

## API Routes Documentation

### Public Routes (No Authentication Required)

#### Authentication
```
POST   /api/auth/signup                    # Create new account (rate-limited: 5/email, 10/IP per hour)
POST   /api/auth/signin                    # Login with credentials (rate-limited: 5/email, 10/IP per 15min)
GET    /api/auth/verify/:token             # Verify email address
GET    /api/auth/forget-password           # Request password reset (rate-limited: 5/email, 20/IP per hour)
POST   /api/auth/reset-password/:token     # Reset password with token
POST   /api/auth/refresh-token             # Get new access token from refresh token
POST   /api/auth/logout                    # Logout and invalidate session
```

---

### Protected Routes (Authentication Required)

#### Student Routes (`/student`)
**All routes require:** `Authorization: Bearer <token>` + Role: `student`
```
GET    /student/courses/filter                        # Browse published courses (with filters)
GET    /student/course/course-detail/:courseId        # Get course details (preview or full based on enrollment)
POST   /student/course/enrollInCourse/:courseId       # Enroll in a course
GET    /student/course/getEnrolledCourses             # Get all enrolled courses
POST   /student/course/addReview/:courseId            # Write or update course review
GET    /student/course/get-course-review/:courseId    # Get course review by students
GET    /play-video/course/:courseId/module/:moduleId/video/:videoId          # Get signed url of video to play it on frontend          
PATCH  /student/course/:courseId/module/:moduleId/video/:videoId/progress    # Save video progress
```

---

#### Instructor Routes (`/instructor`)
**All routes require:** `Authorization: Bearer <token>` + Role: `instructor`

**Profile & Verification**
```
POST   /instructor/instructor-verification            # Apply for instructor verification
GET    /instructor/verification-request               # View own verification request status
GET    /instructor/get-signature                      # Get Cloudinary signed upload signature
```

**Course Management** (⚠️ Requires instructor verification)
```
POST   /instructor/draft-course                       # Create new course in draft mode
GET    /instructor/get-all-courses                    # Get all own courses
PUT    /instructor/course-update/:courseId            # Update course metadata
DELETE /instructor/delete-course/:courseId            # Delete a course
GET    /instructor/analytics/course/:courseId         # Get course analytics
```

**Module Management** (⚠️ Requires instructor verification)
```
POST   /instructor/course/:draftCourseId/add-module           # Add module to course
PUT    /instructor/course/:courseId/reorder-module            # Reorder modules
DELETE /instructor/delete-module/course/:courseId/module/:moduleId   # Delete module
```

**Video Management** (⚠️ Requires instructor verification)
```
POST   /instructor/add-video/course/:courseId/module/:moduleId              # Add video to module
PUT    /instructor/course/:courseId/module/:moduleId/reorder-videos         # Reorder videos in module
DELETE /instructor/delete-video/course/:courseId/module/:moduleId/video/:videoId   # Delete video
```

**Course Review Workflow** (⚠️ Requires instructor verification)
```
POST   /instructor/course/:courseId/review-request    # Submit course for admin review
GET    /instructor/course-review/:courseId            # Get course review status/feedback
```

> **Note:** After getting signature from `/instructor/get-signature`, upload files directly to Cloudinary:
> ```
> POST https://api.cloudinary.com/v1_1/<cloud_name>/<upload-type>/upload
> Upload types: image | raw | video
> Form-data: file, signature, api_key, folder, timestamp
> ```

---

#### Admin Routes (`/admin`)
**All routes require:** `Authorization: Bearer <token>` + Role: `admin`

**User Management**
```
PUT    /admin/get-user/:userId                        # Block user (permanent/temporary)
GET    /admin/review-unblock/get-users                # Get all unblock requests
GET    /admin/pending-request                         # Get pending unblock requests
PUT    /admin/status/update-user/:requestId           # Approve/reject unblock request
```

**Instructor Verification**
```
GET    /admin/verification/request                    # Get instructor verification requests (with filters)
GET    /admin/verification/request/:id                # Get single verification request details
PATCH  /admin/verification/request/:id                # Approve/reject instructor verification
```

**Course Review**
```
PATCH  /admin/draft-course/review-request/:requestId  # Approve/reject submitted course
```

**Queue Monitoring**
```
GET    /admin/queues                                  # BullMQ dashboard (requires Basic Auth)
```

---

#### Common Routes (`/common`)
**Available to all authenticated users**
```
POST   /common/unblock-request                        # Request account unblock (for blocked users)
```

---

### Global Routes
```
GET    /api/auth/profile                              # Get current user profile (requires auth)
PUT    /api/auth/change-password                      # Change password (requires auth)
```

---

### Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

### Authentication & Authorization

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Rate Limiting:**
- Signup: 5 requests per email, 10 per IP per hour
- Signin: 5 requests per email, 10 per IP per 15 minutes
- Forget Password: 5 requests per email, 20 per IP per hour
- Global: 100 requests per IP per 15 minutes

**Role-Based Access:**
- Student routes: Only accessible by users with `student` role
- Instructor routes: Only accessible by users with `instructor` role
- Admin routes: Only accessible by users with `admin` role
- Some instructor routes additionally require verification approval

---

### Special Middleware Guards

| Route Pattern | Additional Check |
|--------------|------------------|
| `/instructor/draft-course` onwards | Requires `isInstructorVerified` |
| `/api/auth/signin` | Checks `isUserBlocked` |
| `/admin/queues` | Requires Basic Auth (separate from JWT) |

---

### Cloudinary Upload Flow

1. **Get Signature:**
```
   GET /instructor/get-signature
   Response: { signature, timestamp, api_key, folder }
```

2. **Upload to Cloudinary:**
```
   POST https://api.cloudinary.com/v1_1/{cloud_name}/{resource_type}/upload
   Form-data: file, signature, api_key, folder, timestamp
```

3. **Send Cloudinary Response to Backend:**
   Include `secure_url`, `public_id`, `bytes`, `resource_type` in your subsequent API calls

---


## Environment Variables

### Server
- PORT=5000

### MongoDB Atlas
- MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/thinkbot

### Redis
- REDIS_URL=redis://default:your_redis_password@redis-host:12345

### JWT Secrets
- ACCESS_TOKEN=your_super_strong_access_token_secret
- REFRESH_TOKEN=your_even_stronger_refresh_token_secret
- JWT_SECRET=fallback_strong_secret

### Email (Brevo API)
- EMAIL_USER=your-email@example.com
- BREVO_API_KEY=your_brevo_api_key_here

### Frontend
- FRONTEND_URL=https://thinkbot-yourapp.vercel.app

---

## Getting Started (Local Setup)

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Redis instance (local or cloud)
- Cloudinary account
- **Brevo account** (for email delivery - get free API key at https://app.brevo.com)


### Installation
```bash
git clone https://github.com/01MOHDHASAN11/LMS_backend_project.git
cd your-folder-name
npm install
```

### Running the Application
```bash
# Terminal 1 - Run API server
npm run dev

# Terminal 2 - Run background worker (processes email jobs)
npm run worker
```

**⚠️ Important:** Both the API server and worker must run simultaneously for full functionality (signup emails, password reset, course reviews, etc.).

---

## Deployment

This project is production-ready and deployed on **Render** with:
- **Web Service** (API server)
- **Background Worker** (email processing)
- **Redis** (Upstash Cloud Redis)
- **MongoDB Atlas** (Database)

**Production Considerations:**
- SMTP ports (587/465) are blocked on Render → Using Brevo API instead
- Both API server and worker deployed as separate services
- Environment variables managed via Render dashboard
- Redis connection pooling configured for production load

**Live API:** `https://lms-backend-api-vf7d.onrender.com`

**Cold Start Delay (Free Tier)**
- Render's free tier spins down after 15 minutes of inactivity
- First API request after sleep may take **50-60 seconds** to respond
- Subsequent requests will be fast
- Please be patient on the first request

**Email Delivery**
- Emails are sent successfully but **may land in spam folder**
- This is expected because:
  - No custom domain configured (using generic sender)
  - SPF/DKIM/DMARC not set up
  - Free Brevo account with limited sender reputation
- **Action Required:** Check your spam/junk folder for verification emails
- This will be resolved in production with a custom domain