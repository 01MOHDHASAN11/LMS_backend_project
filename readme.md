# ThinkBot Backend – Secure & Scalable Node.js API (In Active Development)

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-brightgreen)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-v4.18%2B-000000?style=flat&logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-Live-E14329?style=flat&logo=redis)](https://redis.io)
[![Status](https://img.shields.io/badge/Status-Active%20Development-blueviolet)]()

A **production-ready secure backend API** built with Node.js + Express, featuring enterprise-grade authentication, role-based access control, advanced user block/unblock workflow, Redis session management, and multiple layers of security.

Currently in **active development** – more features coming soon (Course Creation, Enrollment, Reviews, etc.)

---

### Key Highlights

- JWT + Redis Refresh Tokens (secure & revocable sessions)
- Full User Block/Unblock System with admin approval workflow
- Email Verification & Secure Password Reset
- Role-Based Access Control (Admin / Student / Instructor)
- Smart Rate Limiting (per email + per IP)
- NoSQL Injection & XSS Protection
- Clean MVC Architecture + Joi Validation
- Redis-powered session invalidation on logout/block

---

### Core Features (Implemented)

| Feature                              | Status  | Details                                                                 |
|-------------------------------------|--------|--------------------------------------------------------------------------|
| Secure Signup / Login / Logout                | Done   | JWT access + Redis refresh token                                                          |
| Email Verification                     | Done   | Verification link on signup                                                       |
| Forgot & Reset Password                  | Done   | Rate-limited + expiring reset tokens                                                  |
| Refresh Token Endpoint                   | Done   | Issues new access token, stored in Redis                                               |
| User Blocking (Permanent/Temporary)   | Done   | Admin-only, blocks login & token refresh                                                 |
| Unblock Request System                 | Done   | Users → Admin reviews → Approve/Reject + email notification                          |
| Rate Limiting (Email + IP)              | Done   | Prevents brute force & bot signups                                                    |
| Security Hardening                      | Done   | Helmet, mongo-sanitize, xss protection, bcrypt, secure headers                                 |
| Role-Based Route Protection              | Done   | Admin-only & authenticated routes                                                          |

---

### Upcoming Features (Next Commits)

- Instructor → Create / Update / Publish Courses  
- Student → Enroll & View Enrolled Courses  
- Course Reviews & Ratings  
- Payment Integration (Stripe/PayPal)  
- API Documentation with Swagger  
- Unit & Integration Tests (Jest + Supertest)

---

### Project Structure

```bash
thinkbot-backend/
├── config/   
├── controllers/
├── middleware/
├── models/
├── routes/
├── validation/
├── .env
├── server.js
├── package.json
└── README.md


### Environment Variables

Create a `.env` file in the root directory (never commit this file).  
Use the template below:

```env
# Server
PORT=5000

# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/thinkbot?retryWrites=true&w=majority

# Redis (Local or Cloud - Redis Labs, Upstash, etc.)
REDIS_URL=redis://default:your_redis_password@redis-12345.c1.ap-south-1-1.ec2.cloud.redislabs.com:12345

# JWT Secrets (Use strong, random strings - at least 64 characters recommended)
ACCESS_TOKEN=your_super_strong_access_token_secret_here_change_it_in_production_abc123xyz
REFRESH_TOKEN=another_even_longer_and_stronger_refresh_token_secret_never_reuse_above

# Fallback JWT secret (used in some middlewares)
JWT_SECRET=fallback_strong_secret_for_compatibility

# Email Configuration (Nodemailer)
# Recommended: Use Gmail with App Password or any SMTP service (SendGrid, Mailgun, etc.)
EMAIL_USER=thinkbot.noreply@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop        # 16-digit Gmail App Password (with spaces) or SMTP password

# Frontend URL - Used in email links and CORS
FRONTEND_URL=https://thinkbot-yourapp.vercel.app
# Or for local development
# FRONTEND_URL=http://localhost:3000