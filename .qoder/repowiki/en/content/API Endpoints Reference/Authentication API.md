# Authentication API

<cite>
**Referenced Files in This Document**
- [route.ts](file://app/api/auth/route.ts)
- [route.ts](file://app/api/auth/change-password/route.ts)
- [route.ts](file://app/api/setup-password/route.ts)
- [auth.tsx](file://lib/auth.tsx)
- [passwordUtils.ts](file://lib/passwordUtils.ts)
- [firebaseAdmin.ts](file://lib/firebaseAdmin.ts)
- [firebase.ts](file://lib/firebase.ts)
- [middleware.ts](file://middleware.ts)
- [validators.ts](file://lib/validators.ts)
- [userMemberService.ts](file://lib/userMemberService.ts)
- [page.tsx](file://app/login/page.tsx)
- [page.tsx](file://app/setup-password/page.tsx)
- [ROLE_BASED_ACCESS_CONTROL.md](file://ROLE_BASED_ACCESS_CONTROL.md)
</cite>

## Update Summary
**Changes Made**
- Enhanced archived account detection logic with two-tier checking against users and members collections
- Added structured JSON responses for archived account information including `isArchived`, `archivedAt`, and `archiveReason` fields
- Improved error handling for partial data inconsistencies during member collection validation
- Updated authentication flow diagrams to reflect archived account detection
- Enhanced troubleshooting guidance for archived account scenarios

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document provides comprehensive API documentation for the authentication endpoints in the SAMPA Cooperative Management System. It focuses on:
- The main login endpoint (/api/auth) with POST method, including request/response schemas, password verification (PBKDF2 with salt, timing-safe comparison), backward compatibility with plain text passwords, and role validation.
- Enhanced archived account detection logic that performs two-tier archived account checking against users and members collections with structured JSON responses.
- Password setup endpoint (/api/setup-password) for initial user registration and change password endpoint (/api/auth/change-password) for authenticated users.
- Authentication flow, security considerations (rate limiting, session management), and integration examples for client applications.

## Project Structure
The authentication system spans server-side API routes, client-side authentication context, and supporting utilities for Firebase integration, password hashing, and role-based routing.

```mermaid
graph TB
subgraph "Client"
UI_Login["Login Page<br/>(app/login/page.tsx)"]
UI_Setup["Setup Password Page<br/>(app/setup-password/page.tsx)"]
AuthCtx["Auth Context<br/>(lib/auth.tsx)"]
end
subgraph "API Routes"
AuthAPI["POST /api/auth<br/>(app/api/auth/route.ts)"]
SetupAPI["POST /api/setup-password<br/>(app/api/setup-password/route.ts)"]
ChangeAPI["POST /api/auth/change-password<br/>(app/api/auth/change-password/route.ts)"]
end
subgraph "Utilities"
PWUtil["Password Utils<br/>(lib/passwordUtils.ts)"]
FB_Admin["Firebase Admin<br/>(lib/firebaseAdmin.ts)"]
FB_Client["Firebase Client<br/>(lib/firebase.ts)"]
Validators["Route Validators<br/>(lib/validators.ts)"]
UMS["User-Member Service<br/>(lib/userMemberService.ts)"]
end
subgraph "Middleware"
MW["Middleware<br/>(middleware.ts)"]
end
UI_Login --> AuthCtx
UI_Setup --> SetupAPI
AuthCtx --> AuthAPI
AuthAPI --> FB_Admin
AuthAPI --> UMS
SetupAPI --> FB_Admin
ChangeAPI --> FB_Client
ChangeAPI --> PWUtil
MW --> Validators
```

**Diagram sources**
- [route.ts:48-264](file://app/api/auth/route.ts#L48-L264)
- [route.ts:5-98](file://app/api/auth/change-password/route.ts#L5-L98)
- [route.ts:25-146](file://app/api/setup-password/route.ts#L25-L146)
- [auth.tsx:158-348](file://lib/auth.tsx#L158-L348)
- [passwordUtils.ts:4-62](file://lib/passwordUtils.ts#L4-L62)
- [firebaseAdmin.ts:111-266](file://lib/firebaseAdmin.ts#L111-L266)
- [firebase.ts:90-307](file://lib/firebase.ts#L90-L307)
- [validators.ts:199-235](file://lib/validators.ts#L199-L235)
- [userMemberService.ts:99-198](file://lib/userMemberService.ts#L99-L198)
- [middleware.ts:5-56](file://middleware.ts#L5-L56)

**Section sources**
- [route.ts:48-264](file://app/api/auth/route.ts#L48-L264)
- [route.ts:5-98](file://app/api/auth/change-password/route.ts#L5-L98)
- [route.ts:25-146](file://app/api/setup-password/route.ts#L25-L146)
- [auth.tsx:158-348](file://lib/auth.tsx#L158-L348)
- [passwordUtils.ts:4-62](file://lib/passwordUtils.ts#L4-L62)
- [firebaseAdmin.ts:111-266](file://lib/firebaseAdmin.ts#L111-L266)
- [firebase.ts:90-307](file://lib/firebase.ts#L90-L307)
- [validators.ts:199-235](file://lib/validators.ts#L199-L235)
- [userMemberService.ts:99-198](file://lib/userMemberService.ts#L99-L198)
- [middleware.ts:5-56](file://middleware.ts#L5-L56)

## Core Components
- Login API (/api/auth):
  - Validates JSON payload, email format, and presence of credentials.
  - Queries Firestore for user by email.
  - **Enhanced**: Performs two-tier archived account checking against users and members collections with structured JSON responses.
  - Enforces password policy: hashed PBKDF2 with salt or legacy plain text.
  - Uses timing-safe string comparison to prevent timing attacks.
  - Validates role against supported roles array and normalizes role values.
  - Updates lastLogin timestamp and performs user-member linkage validation.
  - Returns user object with uid, email, displayName, role, lastLogin.

- Password Setup API (/api/setup-password):
  - Validates email and password strength.
  - Ensures account exists and password is not yet set.
  - Hashes password using PBKDF2 with salt and stores in Firestore.

- Change Password API (/api/auth/change-password):
  - Validates input and user existence by email.
  - Verifies current password using PBKDF2 with stored salt.
  - Updates password hash and salt, and propagates to members collection if present.

- Client Integration:
  - Auth context handles login flow, sets cookies, and redirects to role-specific dashboards.
  - Login and setup pages integrate with the APIs and display user-friendly feedback.

**Section sources**
- [route.ts:48-264](file://app/api/auth/route.ts#L48-L264)
- [route.ts:5-98](file://app/api/auth/change-password/route.ts#L5-L98)
- [route.ts:25-146](file://app/api/setup-password/route.ts#L25-L146)
- [auth.tsx:197-348](file://lib/auth.tsx#L197-L348)
- [page.tsx:26-79](file://app/login/page.tsx#L26-L79)
- [page.tsx:94-132](file://app/setup-password/page.tsx#L94-L132)

## Architecture Overview
The authentication flow integrates client-side UI, serverless API routes, Firebase Admin SDK for server-side queries, and client-side Firebase for password updates. Middleware enforces role-based routing and session cookies. **Enhanced**: The system now includes comprehensive archived account detection with two-tier checking against both users and members collections.

```mermaid
sequenceDiagram
participant C as "Client App"
participant UI as "Login Page<br/>(app/login/page.tsx)"
participant AC as "Auth Context<br/>(lib/auth.tsx)"
participant API as "Login API<br/>(/api/auth)"
participant FA as "Firebase Admin<br/>(lib/firebaseAdmin.ts)"
participant UM as "User-Member Service<br/>(lib/userMemberService.ts)"
C->>UI : "User submits email/password"
UI->>AC : "customLogin(email, password)"
AC->>API : "POST /api/auth {email,password}"
API->>FA : "Query users by email"
FA-->>API : "User document"
API->>API : "Check archived status in users collection"
API->>API : "Check archived status in members collection"
API->>API : "Verify password (PBKDF2 or plain text)"
API->>UM : "Validate & heal user-member linkage"
UM-->>API : "Validation result"
API->>FA : "Update lastLogin timestamp"
API-->>AC : "{success : true,user,role}" or "{success : false,isArchived,archivedAt,archiveReason}"
AC->>AC : "Set cookies, redirect to dashboard"
AC-->>C : "Authenticated state"
```

**Diagram sources**
- [page.tsx:26-79](file://app/login/page.tsx#L26-L79)
- [auth.tsx:356-514](file://lib/auth.tsx#L356-L514)
- [route.ts:48-264](file://app/api/auth/route.ts#L48-L264)
- [firebaseAdmin.ts:150-194](file://lib/firebaseAdmin.ts#L150-L194)
- [userMemberService.ts:99-198](file://lib/userMemberService.ts#L99-L198)

## Detailed Component Analysis

### Login Endpoint (/api/auth)
- Method: POST
- Request Body Schema:
  - email: string (required, validated format)
  - password: string (required)
- Response Format:
  - success: boolean
  - user: object
    - uid: string
    - email: string
    - displayName: string | null
    - role: string
    - lastLogin: string | null
  - role: string (included for client-side routing)
  - error: string | null (on failure)
  - needsPasswordSetup: boolean | null (on password-not-set scenario)
  - **Enhanced**: isArchived: boolean | null (on archived account)
  - **Enhanced**: archivedAt: string | null (timestamp of archiving)
  - **Enhanced**: archiveReason: string | null (reason for archiving)

- Processing Logic:
  - Parses JSON body and validates presence of email and password.
  - Validates email format using regex.
  - Queries Firestore for user by email.
  - **Enhanced**: Checks archived status in users collection with structured JSON response.
  - **Enhanced**: Performs two-tier archived account checking against members collection.
  - **Enhanced**: Returns structured JSON with archived account information including timestamps and reasons.
  - Checks isPasswordSet flag; if false, returns needsPasswordSetup indicator.
  - Verifies password:
    - New format: PBKDF2-HMAC-SHA256 with 100k iterations and random salt.
    - Legacy format: timing-safe comparison against stored plain text password.
  - Validates role against supported roles array; normalizes role to lowercase and trims whitespace.
  - Updates lastLogin timestamp in Firestore.
  - Validates and heals user-member linkage.
  - Returns success with user object and role.

- Error Responses:
  - 400: Invalid JSON, missing email/password, invalid email format, password not set, invalid role.
  - 401: Incorrect password.
  - 403: **Enhanced**: Account is archived with structured error response.
  - 404: Account not found.
  - 500: Internal server error.

```mermaid
flowchart TD
Start(["POST /api/auth"]) --> Parse["Parse JSON body"]
Parse --> ValidateReq{"Required fields present?"}
ValidateReq --> |No| Err400a["400 Bad Request"]
ValidateReq --> |Yes| ValidateEmail["Validate email format"]
ValidateEmail --> EmailOK{"Valid email?"}
EmailOK --> |No| Err400b["400 Bad Request"]
EmailOK --> |Yes| QueryUser["Query Firestore by email"]
QueryUser --> Found{"User found?"}
Found --> |No| Err404["404 Not Found"]
Found --> |Yes| CheckArchivedUsers["Check archived status in users collection"]
CheckArchivedUsers --> IsArchivedUsers{"Is archived?"}
IsArchivedUsers --> |Yes| Err403Users["403 Forbidden with archived info"]
IsArchivedUsers --> |No| CheckArchivedMembers["Check archived status in members collection"]
CheckArchivedMembers --> IsArchivedMembers{"Is archived?"}
IsArchivedMembers --> |Yes| Err403Members["403 Forbidden with archived info"]
IsArchivedMembers --> |No| CheckPwdSet{"isPasswordSet?"}
CheckPwdSet --> |No| NeedsSetup["needsPasswordSetup=true"]
CheckPwdSet --> |Yes| VerifyPwd["Verify password (PBKDF2 or plain text)"]
VerifyPwd --> PwdOK{"Password valid?"}
PwdOK --> |No| Err401["401 Unauthorized"]
PwdOK --> |Yes| ValidateRole["Validate role vs supported roles"]
ValidateRole --> RoleOK{"Role valid?"}
RoleOK --> |No| Err400c["400 Bad Request"]
RoleOK --> |Yes| UpdateLastLogin["Update lastLogin timestamp"]
UpdateLastLogin --> Done["200 OK with user and role"]
```

**Diagram sources**
- [route.ts:48-264](file://app/api/auth/route.ts#L48-L264)

**Section sources**
- [route.ts:48-264](file://app/api/auth/route.ts#L48-L264)

### Password Setup Endpoint (/api/setup-password)
- Method: POST
- Request Body Schema:
  - email: string (required, validated format)
  - password: string (required, minimum 8 characters)
- Response Format:
  - success: boolean
  - message: string | null (on success)
  - error: string | null (on failure)

- Processing Logic:
  - Validates email and password strength.
  - Queries Firestore for user by email.
  - Ensures isPasswordSet is false.
  - Hashes password using PBKDF2 with salt and stores passwordHash, salt, and isPasswordSet.

- Error Responses:
  - 400: Missing fields, invalid email, weak password, password already set, account not found.
  - 500: Internal server error.

**Section sources**
- [route.ts:25-146](file://app/api/setup-password/route.ts#L25-L146)

### Change Password Endpoint (/api/auth/change-password)
- Method: POST
- Request Body Schema:
  - email: string (required)
  - currentPassword: string (required)
  - newPassword: string (required, minimum 6 characters)
- Response Format:
  - success: boolean
  - message: string | null (on success)
  - error: string | null (on failure)

- Processing Logic:
  - Validates input and password length.
  - Queries Firestore by email to retrieve user ID.
  - Uses password utility to verify current password with PBKDF2 and stored salt.
  - Hashes new password and updates both users and members collections if present.

- Error Responses:
  - 400: Missing fields, invalid email, weak password, user not found.
  - 401: Current password incorrect.
  - 500: Internal server error.

**Section sources**
- [route.ts:5-98](file://app/api/auth/change-password/route.ts#L5-L98)
- [passwordUtils.ts:4-62](file://lib/passwordUtils.ts#L4-L62)

### Client Integration and Session Management
- Client-side login flow:
  - The login page triggers customLogin which calls the Login API.
  - On success, cookies are set for authenticated and userRole, and the user is redirected to their role-specific dashboard.
  - On needsPasswordSetup, the client redirects to the setup-password page.
  - **Enhanced**: On archived account detection, clients receive structured error responses with archived information for appropriate user messaging.

- Middleware and role-based routing:
  - Middleware reads authentication cookies and enforces route access based on user roles.
  - Validators define allowed paths per role and prevent cross-access between admin and user dashboards.

- Security considerations:
  - Cookies are not HTTP-only to allow client-side access for role-based routing.
  - Logout clears cookies, localStorage, and sessionStorage to prevent session persistence.

**Section sources**
- [page.tsx:26-79](file://app/login/page.tsx#L26-L79)
- [auth.tsx:197-348](file://lib/auth.tsx#L197-L348)
- [middleware.ts:5-56](file://middleware.ts#L5-L56)
- [validators.ts:199-235](file://lib/validators.ts#L199-L235)
- [ROLE_BASED_ACCESS_CONTROL.md:1-89](file://ROLE_BASED_ACCESS_CONTROL.md#L1-L89)

## Dependency Analysis
The authentication system exhibits clear separation of concerns:
- API routes depend on Firebase Admin SDK for Firestore operations.
- Client-side authentication context orchestrates UI flows and cookie management.
- Password utilities encapsulate PBKDF2 hashing and verification.
- Middleware and validators enforce role-based access control.

```mermaid
graph LR
AC["Auth Context<br/>(lib/auth.tsx)"] --> API_A["Login API<br/>(/api/auth)"]
AC --> API_C["Change Password API<br/>(/api/auth/change-password)"]
API_A --> FA["Firebase Admin<br/>(lib/firebaseAdmin.ts)"]
API_A --> UMS["User-Member Service<br/>(lib/userMemberService.ts)"]
API_C --> PWU["Password Utils<br/>(lib/passwordUtils.ts)"]
API_C --> FC["Firebase Client<br/>(lib/firebase.ts)"]
MW["Middleware<br/>(middleware.ts)"] --> VAL["Validators<br/>(lib/validators.ts)"]
```

**Diagram sources**
- [auth.tsx:158-348](file://lib/auth.tsx#L158-L348)
- [route.ts:48-264](file://app/api/auth/route.ts#L48-L264)
- [route.ts:5-98](file://app/api/auth/change-password/route.ts#L5-L98)
- [firebaseAdmin.ts:111-266](file://lib/firebaseAdmin.ts#L111-L266)
- [firebase.ts:90-307](file://lib/firebase.ts#L90-L307)
- [passwordUtils.ts:4-62](file://lib/passwordUtils.ts#L4-L62)
- [middleware.ts:5-56](file://middleware.ts#L5-L56)
- [validators.ts:199-235](file://lib/validators.ts#L199-L235)

**Section sources**
- [auth.tsx:158-348](file://lib/auth.tsx#L158-L348)
- [route.ts:48-264](file://app/api/auth/route.ts#L48-L264)
- [route.ts:5-98](file://app/api/auth/change-password/route.ts#L5-L98)
- [firebaseAdmin.ts:111-266](file://lib/firebaseAdmin.ts#L111-L266)
- [firebase.ts:90-307](file://lib/firebase.ts#L90-L307)
- [passwordUtils.ts:4-62](file://lib/passwordUtils.ts#L4-L62)
- [middleware.ts:5-56](file://middleware.ts#L5-L56)
- [validators.ts:199-235](file://lib/validators.ts#L199-L235)

## Performance Considerations
- PBKDF2 cost parameters:
  - 100k iterations with SHA-256 provide strong security; consider monitoring login latency and adjusting parameters if needed.
- Database queries:
  - Single-field equality query on email is efficient; ensure Firestore indexes are configured accordingly.
  - **Enhanced**: Two-tier archived account checking adds minimal overhead with graceful error handling for member collection queries.
- Asynchronous operations:
  - Password hashing and Firestore updates are asynchronous; errors are handled gracefully without failing the login flow.

## Troubleshooting Guide
Common issues and resolutions:
- Invalid credentials:
  - Ensure email and password are provided and formatted correctly.
  - Verify password meets strength requirements and matches stored hash.
- Account not found:
  - Confirm the email exists in the users collection.
- **Enhanced**: Archived account detection:
  - If receiving 403 Forbidden with archived information, check both users and members collections for archived status.
  - Review archivedAt timestamp and archiveReason for account restoration procedures.
  - Contact SAMPA staff for account restoration assistance.
- Password not set:
  - Redirect to setup-password endpoint to configure a password.
- Invalid role:
  - Ensure the user's role is one of the supported roles and normalized to lowercase.
- Database initialization errors:
  - Check Firebase Admin credentials and environment variables.
- Middleware redirect loops:
  - Verify cookies are set correctly and validators permit access to the requested route.

**Section sources**
- [route.ts:70-192](file://app/api/auth/route.ts#L70-L192)
- [route.ts:30-104](file://app/api/setup-password/route.ts#L30-L104)
- [firebaseAdmin.ts:13-108](file://lib/firebaseAdmin.ts#L13-L108)
- [validators.ts:199-235](file://lib/validators.ts#L199-L235)

## Conclusion
The SAMPA Cooperative Management System implements a robust, role-aware authentication system with secure password handling, clear API contracts, and client-side integration. **Enhanced**: The system now includes comprehensive archived account detection with two-tier checking against users and members collections, providing structured JSON responses for archived account information and improved error handling for partial data inconsistencies. This enables reliable authentication, password management, and role-based routing across the application.

## Appendices

### API Definitions

- POST /api/auth
  - Request: { email: string, password: string }
  - Success Response: { success: true, user: { uid, email, displayName, role, lastLogin }, role: string }
  - **Enhanced** Error Response (Archived): { success: false, error: string, isArchived: true, archivedAt: string, archiveReason: string }
  - Error Responses: 400 (invalid input/format, role validation), 401 (incorrect password), 403 (archived account), 404 (account not found), 500 (internal error)

- POST /api/setup-password
  - Request: { email: string, password: string }
  - Success Response: { success: true, message: string }
  - Error Responses: 400 (invalid input/format, password already set, account not found), 500 (internal error)

- POST /api/auth/change-password
  - Request: { email: string, currentPassword: string, newPassword: string }
  - Success Response: { success: true, message: string }
  - Error Responses: 400 (invalid input/format, user not found), 401 (incorrect current password), 500 (internal error)

### Supported Roles
- Admin: admin, secretary, chairman, vice chairman, manager, treasurer, board of directors
- User: member, driver, operator

### Archived Account Detection
**Enhanced**: The system now performs two-tier archived account checking:
1. **Primary Check**: Validates archived status in users collection with fields: `status`, `archived`, `archivedAt`, `archiveReason`
2. **Secondary Check**: Performs fallback archived status check in members collection for comprehensive coverage
3. **Structured Response**: Returns JSON with `isArchived: true`, `archivedAt` timestamp, and `archiveReason` for client-side handling
4. **Graceful Handling**: Continues login process even if member collection check fails

**Section sources**
- [route.ts:177-192](file://app/api/auth/route.ts#L177-L192)
- [route.ts:128-170](file://app/api/auth/route.ts#L128-L170)
- [ROLE_BASED_ACCESS_CONTROL.md:9-24](file://ROLE_BASED_ACCESS_CONTROL.md#L9-L24)