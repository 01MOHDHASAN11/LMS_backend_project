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

### Email Background Processing

All email-related tasks are processed **asynchronously** using a **single BullMQ queue** (`email-queue`) and **one worker** with a switch-case strategy.

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

### Email (SMTP / Nodemailer)
- EMAIL_USER=your-email@example.com
- EMAIL_PASSWORD=your_app_password

### Frontend
- FRONTEND_URL=https://thinkbot-yourapp.vercel.app

