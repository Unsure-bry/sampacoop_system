# Authentication System

<cite>
**Referenced Files in This Document**
- [lib/auth.tsx](file://lib/auth.tsx)
- [app/api/auth/route.ts](file://app/api/auth/route.ts)
- [middleware.ts](file://middleware.ts)
- [lib/validators.ts](file://lib/validators.ts)
- [lib/passwordUtils.ts](file://lib/passwordUtils.ts)
- [lib/firebase.ts](file://lib/firebase.ts)
- [lib/firebaseAdmin.ts](file://lib/firebaseAdmin.ts)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts)
- [lib/userMemberService.ts](file://lib/userMemberService.ts)
- [lib/userActionTracker.ts](file://lib/userActionTracker.ts)
- [app/login/page.tsx](file://app/login/page.tsx)
- [app/register/page.tsx](file://app/register/page.tsx)
- [app/setup-password/page.tsx](file://app/setup-password/page.tsx)
- [IMPLEMENTATION_SUMMARY.md](file://IMPLEMENTATION_SUMMARY.md)
- [ROLE_BASED_ACCESS_CONTROL.md](file://ROLE_BASED_ACCESS_CONTROL.md)
</cite>

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

## Introduction
This document provides comprehensive documentation for the SAMPA Cooperative Management System's authentication system. It covers the multi-role authentication architecture supporting Admin, Chairman, Vice-Chairman, Treasurer, Secretary, Driver, Operator, and Member roles. The system implements secure password handling, middleware-based route protection, session management via browser cookies, and automatic role-based dashboard redirection. It also details the integration with Firebase services and custom user validation logic.

## Project Structure
The authentication system spans client-side React components, Next.js API routes, middleware, and Firebase utilities. Key areas include:
- Client authentication provider and hooks
- Server-side authentication API
- Middleware-based route protection
- Password security utilities
- Firebase client and admin integrations
- User-member linkage validation
- Logout and action tracking utilities

```mermaid
graph TB
subgraph "Client-Side"
AuthProvider["Auth Provider<br/>lib/auth.tsx"]
LoginPage["Login Page<br/>app/login/page.tsx"]
RegisterPage["Register Page<br/>app/register/page.tsx"]
SetupPasswordPage["Setup Password Page<br/>app/setup-password/page.tsx"]
end
subgraph "Server-Side"
AuthAPI["Auth API Route<br/>app/api/auth/route.ts"]
Validators["Route Validators<br/>lib/validators.ts"]
Middleware["Middleware<br/>middleware.ts"]
FirebaseAdmin["Firebase Admin<br/>lib/firebaseAdmin.ts"]
end
subgraph "Utilities"
PasswordUtils["Password Utils<br/>lib/passwordUtils.ts"]
FirebaseClient["Firebase Client<br/>lib/firebase.ts"]
UserMemberService["User-Member Service<br/>lib/userMemberService.ts"]
LogoutUtils["Logout Utils<br/>lib/logoutUtils.ts"]
ActionTracker["Action Tracker<br/>lib/userActionTracker.ts"]
end
LoginPage --> AuthProvider
RegisterPage --> AuthProvider
SetupPasswordPage --> AuthAPI
AuthProvider --> AuthAPI
AuthAPI --> FirebaseAdmin
AuthAPI --> UserMemberService
Middleware --> Validators
AuthProvider --> LogoutUtils
AuthProvider --> ActionTracker
AuthProvider --> PasswordUtils
AuthAPI --> FirebaseClient
```

**Diagram sources**
- [lib/auth.tsx](file://lib/auth.tsx#L158-L680)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L264)
- [middleware.ts](file://middleware.ts#L5-L56)
- [lib/validators.ts](file://lib/validators.ts#L199-L235)
- [lib/passwordUtils.ts](file://lib/passwordUtils.ts#L1-L146)
- [lib/firebase.ts](file://lib/firebase.ts#L90-L307)
- [lib/firebaseAdmin.ts](file://lib/firebaseAdmin.ts#L111-L266)
- [lib/userMemberService.ts](file://lib/userMemberService.ts#L99-L198)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts#L16-L93)
- [lib/userActionTracker.ts](file://lib/userActionTracker.ts#L10-L118)
- [app/login/page.tsx](file://app/login/page.tsx#L12-L223)
- [app/register/page.tsx](file://app/register/page.tsx#L51-L323)
- [app/setup-password/page.tsx](file://app/setup-password/page.tsx#L10-L207)

**Section sources**
- [lib/auth.tsx](file://lib/auth.tsx#L1-L682)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L1-L295)
- [middleware.ts](file://middleware.ts#L1-L62)
- [lib/validators.ts](file://lib/validators.ts#L1-L236)
- [lib/passwordUtils.ts](file://lib/passwordUtils.ts#L1-L146)
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)
- [lib/firebaseAdmin.ts](file://lib/firebaseAdmin.ts#L1-L277)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts#L1-L93)
- [lib/userMemberService.ts](file://lib/userMemberService.ts#L1-L287)
- [lib/userActionTracker.ts](file://lib/userActionTracker.ts#L1-L118)
- [app/login/page.tsx](file://app/login/page.tsx#L1-L223)
- [app/register/page.tsx](file://app/register/page.tsx#L1-L323)
- [app/setup-password/page.tsx](file://app/setup-password/page.tsx#L1-L207)

## Core Components
- Authentication Provider: Manages user state, login/signup, password updates, and logout. Implements role-based dashboard redirection and cookie-based session persistence.
- Authentication API: Validates credentials against Firestore, performs password verification, and returns user data with role for redirection.
- Middleware: Enforces route access based on user roles and cookies, redirecting unauthorized users appropriately.
- Validators: Provides role-specific route validation and conflict prevention logic.
- Password Utilities: Implements PBKDF2-based hashing and verification with timing-safe comparison.
- Firebase Integrations: Client-side Firestore helpers and server-side Admin SDK for secure database operations.
- User-Member Service: Ensures consistent user-member linkage across collections.
- Logout Utilities: Centralized logout handling with cookie and storage cleanup.
- Action Tracker: Logs user actions for audit trails.

**Section sources**
- [lib/auth.tsx](file://lib/auth.tsx#L41-L680)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L264)
- [middleware.ts](file://middleware.ts#L5-L56)
- [lib/validators.ts](file://lib/validators.ts#L1-L236)
- [lib/passwordUtils.ts](file://lib/passwordUtils.ts#L64-L146)
- [lib/firebase.ts](file://lib/firebase.ts#L90-L307)
- [lib/firebaseAdmin.ts](file://lib/firebaseAdmin.ts#L111-L266)
- [lib/userMemberService.ts](file://lib/userMemberService.ts#L99-L198)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts#L16-L93)
- [lib/userActionTracker.ts](file://lib/userActionTracker.ts#L10-L118)

## Architecture Overview
The authentication system follows a client-provider pattern with server-side validation:
- Client initiates login via the Auth Provider, which calls the Auth API.
- The Auth API validates credentials, checks role assignment, and updates last login.
- Successful authentication sets browser cookies and redirects to role-specific dashboard.
- Middleware enforces route access based on cookies and validators.
- Password updates leverage PBKDF2 hashing with secure storage.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant AuthUI as "Login Page<br/>app/login/page.tsx"
participant AuthProvider as "Auth Provider<br/>lib/auth.tsx"
participant AuthAPI as "Auth API<br/>app/api/auth/route.ts"
participant AdminDB as "Firebase Admin<br/>lib/firebaseAdmin.ts"
participant UserMember as "User-Member Service<br/>lib/userMemberService.ts"
Browser->>AuthUI : Submit credentials
AuthUI->>AuthProvider : customLogin(email, password)
AuthProvider->>AuthAPI : POST /api/auth
AuthAPI->>AdminDB : Query users by email
AdminDB-->>AuthAPI : User document
AuthAPI->>UserMember : Validate/Heal user-member link
UserMember-->>AuthAPI : Validation result
AuthAPI->>AuthAPI : Verify password (PBKDF2)
AuthAPI->>AdminDB : Update lastLogin
AdminDB-->>AuthAPI : Success
AuthAPI-->>AuthProvider : {success, user, role}
AuthProvider->>Browser : Set cookies (authenticated, userRole)
AuthProvider->>Browser : Redirect to role dashboard
```

**Diagram sources**
- [app/login/page.tsx](file://app/login/page.tsx#L26-L79)
- [lib/auth.tsx](file://lib/auth.tsx#L356-L514)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L248)
- [lib/firebaseAdmin.ts](file://lib/firebaseAdmin.ts#L150-L194)
- [lib/userMemberService.ts](file://lib/userMemberService.ts#L99-L198)

**Section sources**
- [lib/auth.tsx](file://lib/auth.tsx#L197-L348)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L248)
- [middleware.ts](file://middleware.ts#L5-L56)

## Detailed Component Analysis

### Authentication Provider (Client)
The Auth Provider encapsulates authentication logic:
- User state management with loading indicators
- Login/signup flows with input validation and error handling
- Role-based dashboard redirection using a dedicated helper
- Cookie-based session persistence for authenticated state
- Password update and profile update utilities
- Logout with centralized cleanup and immediate redirect

```mermaid
classDiagram
class AuthProvider {
+user : AppUser|null
+loading : boolean
+signIn(email, password) Promise
+signUp(email, password, fullName) Promise
+createUser(params) Promise
+customLogin(email, password) Promise
+logout() Promise
+resetPassword(email) Promise
+updateProfile(data) Promise
}
class AppUser {
+string uid
+string email
+string displayName?
+string role?
+string lastLogin?
}
class AuthContextType {
<<interface>>
}
AuthProvider --> AppUser : "manages"
AuthProvider --> AuthContextType : "exposes"
```

**Diagram sources**
- [lib/auth.tsx](file://lib/auth.tsx#L11-L61)
- [lib/auth.tsx](file://lib/auth.tsx#L158-L680)

**Section sources**
- [lib/auth.tsx](file://lib/auth.tsx#L158-L680)

### Authentication API (Server)
The server-side authentication route:
- Parses and validates incoming request body
- Queries Firestore for user by email
- Handles missing accounts, password setup requirement, and invalid credentials
- Verifies password using PBKDF2 with timing-safe comparison
- Validates role against a predefined list
- Updates last login timestamp
- Returns structured JSON responses for client consumption

```mermaid
flowchart TD
Start(["POST /api/auth"]) --> ParseBody["Parse JSON body"]
ParseBody --> ValidateInput{"Email & Password provided?"}
ValidateInput --> |No| Return400A["Return 400 Invalid request"]
ValidateInput --> |Yes| QueryUser["Query Firestore by email"]
QueryUser --> UserFound{"User found?"}
UserFound --> |No| Return404["Return 404 Account not found"]
UserFound --> |Yes| CheckPasswordSet{"isPasswordSet?"}
CheckPasswordSet --> |No| Return400B["Return 400 Password setup required"]
CheckPasswordSet --> |Yes| VerifyPassword["Verify PBKDF2 hash"]
VerifyPassword --> ValidPassword{"Valid password?"}
ValidPassword --> |No| Return401["Return 401 Incorrect password"]
ValidPassword --> |Yes| ValidateRole["Validate role in predefined list"]
ValidateRole --> ValidRole{"Valid role?"}
ValidRole --> |No| Return400C["Return 400 Invalid role"]
ValidRole --> |Yes| UpdateLastLogin["Update lastLogin"]
UpdateLastLogin --> Return200["Return success with user & role"]
```

**Diagram sources**
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L248)

**Section sources**
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L264)

### Middleware-Based Route Protection
The middleware enforces route access:
- Skips API routes and static assets
- Reads authentication cookies to determine user identity
- Applies route validation logic to prevent cross-role access
- Redirects unauthorized users to appropriate login pages

```mermaid
flowchart TD
MWStart(["Middleware Entry"]) --> SkipStatic{"Is static/API path?"}
SkipStatic --> |Yes| NextMW["Next()"]
SkipStatic --> |No| ReadCookies["Read cookies: authenticated, userRole"]
ReadCookies --> HasCookies{"Cookies present?"}
HasCookies --> |No| RootCheck{"Is root path?"}
RootCheck --> |Yes| RedirectLogin["Redirect to /login"]
RootCheck --> |No| ValidateAccess["validateRouteAccess()"]
HasCookies --> |Yes| ValidateAccess
ValidateAccess --> NeedsRedirect{"Needs redirect?"}
NeedsRedirect --> |Yes| DoRedirect["Redirect to target path"]
NeedsRedirect --> |No| NextMW
```

**Diagram sources**
- [middleware.ts](file://middleware.ts#L5-L56)
- [lib/validators.ts](file://lib/validators.ts#L199-L235)

**Section sources**
- [middleware.ts](file://middleware.ts#L5-L56)
- [lib/validators.ts](file://lib/validators.ts#L199-L235)

### Password Security Implementation
Password security is implemented using PBKDF2:
- Client-side hashing for registration and password updates
- Server-side verification using PBKDF2 with 100k iterations and SHA-256
- Timing-safe string comparison to prevent timing attacks
- Secure storage of password hashes and salts in Firestore
- Legacy support for plain-text passwords with fallback verification

```mermaid
flowchart TD
PWStart(["Password Operation"]) --> HashOrVerify{"Operation Type?"}
HashOrVerify --> |Hash| GenSalt["Generate random salt"]
GenSalt --> PBKDF2Hash["PBKDF2 with 100k iterations, SHA-256"]
PBKDF2Hash --> Store["Store hash + salt in Firestore"]
HashOrVerify --> |Verify| LoadSalt["Load stored salt"]
LoadSalt --> PBKDF2Verify["PBKDF2 with stored salt"]
PBKDF2Verify --> Compare{"Timing-safe compare"}
Compare --> |Match| Success["Valid password"]
Compare --> |Mismatch| Fail["Invalid password"]
```

**Diagram sources**
- [lib/passwordUtils.ts](file://lib/passwordUtils.ts#L64-L146)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L19-L45)

**Section sources**
- [lib/passwordUtils.ts](file://lib/passwordUtils.ts#L4-L146)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L19-L45)

### Session Management and Logout
Session management relies on browser cookies:
- Cookies store authenticated user ID and role for middleware validation
- Logout clears cookies, localStorage, and sessionStorage
- Immediate redirect prevents back navigation to protected pages
- Action tracker logs login/logout events for audit trails

```mermaid
sequenceDiagram
participant Client as "Client"
participant AuthProvider as "Auth Provider"
participant LogoutUtils as "Logout Utils"
participant Browser as "Browser"
Client->>AuthProvider : logout()
AuthProvider->>LogoutUtils : clearAllAuthData()
LogoutUtils->>Browser : Clear cookies & storage
AuthProvider->>Browser : window.location.replace(redirectPath)
```

**Diagram sources**
- [lib/auth.tsx](file://lib/auth.tsx#L621-L635)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts#L16-L50)

**Section sources**
- [lib/auth.tsx](file://lib/auth.tsx#L621-L635)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts#L16-L93)
- [lib/userActionTracker.ts](file://lib/userActionTracker.ts#L84-L94)

### Role-Based Dashboard Redirection
The system automatically redirects users to role-specific dashboards:
- Role validation occurs on both client and server
- Middleware prevents cross-role access attempts
- Dashboard paths are mapped for all supported roles
- Invalid or missing roles redirect to login with clear messaging

```mermaid
flowchart TD
LoginSuccess["Login Success"] --> GetUserRole["Get user role"]
GetUserRole --> ValidateRole{"Role valid?"}
ValidateRole --> |No| RedirectLogin["Redirect to /login"]
ValidateRole --> |Yes| MapPath["Map role to dashboard path"]
MapPath --> RedirectDash["Redirect to dashboard"]
```

**Diagram sources**
- [lib/auth.tsx](file://lib/auth.tsx#L111-L156)
- [lib/validators.ts](file://lib/validators.ts#L98-L104)

**Section sources**
- [lib/auth.tsx](file://lib/auth.tsx#L111-L156)
- [lib/validators.ts](file://lib/validators.ts#L98-L104)
- [IMPLEMENTATION_SUMMARY.md](file://IMPLEMENTATION_SUMMARY.md#L84-L124)

### User Registration and Password Setup
Registration supports multiple roles and secure password handling:
- Form validation for required fields and password strength
- PBKDF2 hashing and secure storage of credentials
- Automatic redirection to login after successful registration
- Password setup flow for accounts that require initial password configuration

```mermaid
sequenceDiagram
participant User as "User"
participant RegisterPage as "Register Page"
participant FirebaseClient as "Firebase Client"
participant AuthAPI as "Auth API"
User->>RegisterPage : Fill form & submit
RegisterPage->>FirebaseClient : Query existing user
FirebaseClient-->>RegisterPage : Not found
RegisterPage->>RegisterPage : Hash password (PBKDF2)
RegisterPage->>FirebaseClient : Create user document
FirebaseClient-->>RegisterPage : Success
RegisterPage-->>User : Redirect to /login
User->>AuthAPI : Login attempt
AuthAPI-->>User : Password setup required
User->>AuthAPI : Setup password
AuthAPI-->>User : Success, redirect to /login
```

**Diagram sources**
- [app/register/page.tsx](file://app/register/page.tsx#L152-L210)
- [lib/firebase.ts](file://lib/firebase.ts#L90-L146)
- [app/setup-password/page.tsx](file://app/setup-password/page.tsx#L94-L132)

**Section sources**
- [app/register/page.tsx](file://app/register/page.tsx#L71-L210)
- [app/setup-password/page.tsx](file://app/setup-password/page.tsx#L94-L132)

## Dependency Analysis
The authentication system exhibits clear separation of concerns:
- Client provider depends on Firebase client utilities and validators
- Server API depends on Firebase Admin SDK and user-member service
- Middleware depends on validators and cookie parsing
- Password utilities are shared between client and server flows
- Logout utilities centralize cleanup logic

```mermaid
graph TB
AuthProvider["lib/auth.tsx"] --> Validators["lib/validators.ts"]
AuthProvider --> FirebaseClient["lib/firebase.ts"]
AuthProvider --> PasswordUtils["lib/passwordUtils.ts"]
AuthProvider --> LogoutUtils["lib/logoutUtils.ts"]
AuthProvider --> ActionTracker["lib/userActionTracker.ts"]
AuthAPI["app/api/auth/route.ts"] --> FirebaseAdmin["lib/firebaseAdmin.ts"]
AuthAPI --> UserMemberService["lib/userMemberService.ts"]
Middleware["middleware.ts"] --> Validators
AuthProvider --> LoginPage["app/login/page.tsx"]
AuthProvider --> RegisterPage["app/register/page.tsx"]
AuthProvider --> SetupPasswordPage["app/setup-password/page.tsx"]
```

**Diagram sources**
- [lib/auth.tsx](file://lib/auth.tsx#L1-L682)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L1-L295)
- [middleware.ts](file://middleware.ts#L1-L62)
- [lib/validators.ts](file://lib/validators.ts#L1-L236)
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)
- [lib/firebaseAdmin.ts](file://lib/firebaseAdmin.ts#L1-L277)
- [lib/userMemberService.ts](file://lib/userMemberService.ts#L1-L287)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts#L1-L93)
- [lib/userActionTracker.ts](file://lib/userActionTracker.ts#L1-L118)
- [app/login/page.tsx](file://app/login/page.tsx#L1-L223)
- [app/register/page.tsx](file://app/register/page.tsx#L1-L323)
- [app/setup-password/page.tsx](file://app/setup-password/page.tsx#L1-L207)

**Section sources**
- [lib/auth.tsx](file://lib/auth.tsx#L1-L682)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L1-L295)
- [middleware.ts](file://middleware.ts#L1-L62)
- [lib/validators.ts](file://lib/validators.ts#L1-L236)
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)
- [lib/firebaseAdmin.ts](file://lib/firebaseAdmin.ts#L1-L277)
- [lib/userMemberService.ts](file://lib/userMemberService.ts#L1-L287)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts#L1-L93)
- [lib/userActionTracker.ts](file://lib/userActionTracker.ts#L1-L118)
- [app/login/page.tsx](file://app/login/page.tsx#L1-L223)
- [app/register/page.tsx](file://app/register/page.tsx#L1-L323)
- [app/setup-password/page.tsx](file://app/setup-password/page.tsx#L1-L207)

## Performance Considerations
- PBKDF2 iteration count (100k) balances security and performance; adjust based on hardware constraints
- Middleware cookie parsing is lightweight; ensure minimal cookie size
- Firestore queries use indexed fields (email) for efficient lookups
- Parallel updates for user-member linkage reduce latency
- Client-side hashing avoids server overload but requires modern browser support

## Troubleshooting Guide
Common issues and resolutions:
- Invalid role or missing role: Ensure user has a valid role assigned; middleware redirects to login with clear messaging
- Password setup required: Redirect to setup-password flow; verify isPasswordSet flag
- Incorrect password: Verify PBKDF2 hash and salt; check legacy plain-text fallback
- Database connectivity: Validate Firebase configuration and Firestore rules
- Route conflicts: Middleware prevents cross-role access; ensure correct role assignment
- Logout issues: Use centralized logout utilities to clear cookies and storage

**Section sources**
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L114-L192)
- [middleware.ts](file://middleware.ts#L42-L53)
- [lib/logoutUtils.ts](file://lib/logoutUtils.ts#L16-L50)
- [lib/userMemberService.ts](file://lib/userMemberService.ts#L99-L198)

## Conclusion
The SAMPA Cooperative Management System's authentication system provides a robust, role-based authentication framework with secure password handling, middleware-based route protection, and seamless user experience. The implementation leverages PBKDF2 for password security, Firebase for data persistence, and centralized utilities for consistent behavior across roles. The system is designed for maintainability, scalability, and strong security practices.