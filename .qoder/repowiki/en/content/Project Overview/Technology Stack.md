# Technology Stack

<cite>
**Referenced Files in This Document**
- [package.json](file://package.json)
- [next.config.ts](file://next.config.ts)
- [tsconfig.json](file://tsconfig.json)
- [postcss.config.mjs](file://postcss.config.mjs)
- [eslint.config.mjs](file://eslint.config.mjs)
- [firebase.json](file://firebase.json)
- [firestore.rules](file://firestore.rules)
- [middleware.ts](file://middleware.ts)
- [app/layout.tsx](file://app/layout.tsx)
- [lib/firebase.ts](file://lib/firebase.ts)
- [lib/auth.tsx](file://lib/auth.tsx)
- [hooks/useFirestoreData.ts](file://hooks/useFirestoreData.ts)
- [app/api/auth/route.ts](file://app/api/auth/route.ts)
- [app/api/members/route.ts](file://app/api/members/route.ts)
- [app/api/loans/route.ts](file://app/api/loans/route.ts)
- [components/admin/Sidebar.tsx](file://components/admin/Sidebar.tsx)
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
This document describes the technology stack powering the SAMPA Cooperative Management System. The frontend is built with Next.js 16 using App Router, React 19, TypeScript, and Tailwind CSS. The backend leverages Firebase, including Firestore for data, Firebase Authentication, Cloud Functions, and hosting. Development tooling includes ESLint, PostCSS/Tailwind, and optimized builds. Component libraries include Recharts for visualization and Lucide React for icons. The deployment architecture uses Firebase Hosting, and the development workflow supports hot reloading and automatic builds. Version compatibility, dependency relationships, upgrade considerations, and rationale for technology choices are documented to support real-time data, role-based access control, and scalable user management.

## Project Structure
The project follows a modern full-stack architecture:
- Frontend: Next.js 16 App Router with React 19, TypeScript, and Tailwind CSS
- Backend: Firebase (Firestore, Authentication, Cloud Functions, Hosting)
- Development: ESLint, PostCSS/Tailwind, and optimized builds
- Component ecosystem: Recharts, Lucide React, and utility libraries

```mermaid
graph TB
subgraph "Frontend (Next.js 16)"
LAYOUT["app/layout.tsx"]
AUTHCTX["lib/auth.tsx"]
FIREBASELIB["lib/firebase.ts"]
HOOKS["hooks/useFirestoreData.ts"]
COMPONENTS["components/admin/Sidebar.tsx"]
end
subgraph "Backend (Firebase)"
FIRESTORE["Firestore"]
AUTH["Firebase Auth"]
HOSTING["Firebase Hosting"]
CLOUD["Cloud Functions"]
end
subgraph "Dev Tools"
ESLINT["eslint.config.mjs"]
POSTCSS["postcss.config.mjs"]
TS["tsconfig.json"]
NEXTCFG["next.config.ts"]
end
LAYOUT --> AUTHCTX
AUTHCTX --> FIREBASELIB
HOOKS --> FIREBASELIB
COMPONENTS --> AUTHCTX
AUTHCTX --> HOSTING
FIREBASELIB --> FIRESTORE
AUTH --> AUTHCTX
CLOUD --> FIRESTORE
ESLINT --> LAYOUT
POSTCSS --> LAYOUT
TS --> LAYOUT
NEXTCFG --> LAYOUT
```

**Diagram sources**
- [app/layout.tsx](file://app/layout.tsx#L1-L37)
- [lib/auth.tsx](file://lib/auth.tsx#L1-L682)
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)
- [hooks/useFirestoreData.ts](file://hooks/useFirestoreData.ts#L1-L182)
- [components/admin/Sidebar.tsx](file://components/admin/Sidebar.tsx#L1-L279)
- [eslint.config.mjs](file://eslint.config.mjs#L1-L19)
- [postcss.config.mjs](file://postcss.config.mjs#L1-L8)
- [tsconfig.json](file://tsconfig.json#L1-L35)
- [next.config.ts](file://next.config.ts#L1-L8)

**Section sources**
- [package.json](file://package.json#L1-L53)
- [next.config.ts](file://next.config.ts#L1-L8)
- [tsconfig.json](file://tsconfig.json#L1-L35)
- [postcss.config.mjs](file://postcss.config.mjs#L1-L8)
- [eslint.config.mjs](file://eslint.config.mjs#L1-L19)
- [firebase.json](file://firebase.json#L1-L9)
- [firestore.rules](file://firestore.rules#L1-L19)
- [middleware.ts](file://middleware.ts#L1-L62)
- [app/layout.tsx](file://app/layout.tsx#L1-L37)

## Core Components
- Next.js 16 App Router: Pages and API routes under the app directory, with middleware for route protection and redirects.
- React 19: Client components, hooks, and context providers.
- TypeScript: Strictly typed configuration and runtime logic.
- Tailwind CSS: Utility-first styling via PostCSS plugin.
- Firebase: Client SDK for Firestore and Auth; Admin SDK for serverless functions.
- Component libraries: Recharts for charts, Lucide React for icons.
- Development tools: ESLint, PostCSS, and optimized builds.

**Section sources**
- [package.json](file://package.json#L16-L51)
- [app/layout.tsx](file://app/layout.tsx#L1-L37)
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)
- [lib/auth.tsx](file://lib/auth.tsx#L1-L682)
- [hooks/useFirestoreData.ts](file://hooks/useFirestoreData.ts#L1-L182)
- [eslint.config.mjs](file://eslint.config.mjs#L1-L19)
- [postcss.config.mjs](file://postcss.config.mjs#L1-L8)

## Architecture Overview
The system separates concerns across client and server:
- Client: Next.js pages, context provider for auth, and hooks for real-time Firestore data.
- Serverless: API routes implement authentication and CRUD operations using Firebase Admin SDK.
- Real-time: Firestore listeners provide live updates; middleware enforces role-based routing.
- Styling: Tailwind CSS with PostCSS; fonts loaded via Next.js font optimization.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Next as "Next.js App"
participant API as "API Route (/api/auth)"
participant Admin as "Firebase Admin SDK"
participant DB as "Firestore"
Browser->>Next : "User submits login form"
Next->>API : "POST /api/auth {email,password}"
API->>Admin : "Query users by email"
Admin->>DB : "Query users where email == ?"
DB-->>Admin : "User document"
Admin->>Admin : "Verify password (PBKDF2)"
Admin-->>API : "User data with role"
API->>DB : "Update lastLogin timestamp"
API-->>Next : "JSON {success,user,role}"
Next-->>Browser : "Set cookies, redirect to dashboard"
```

**Diagram sources**
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L264)
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)
- [lib/auth.tsx](file://lib/auth.tsx#L197-L348)

**Section sources**
- [middleware.ts](file://middleware.ts#L1-L62)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L1-L295)
- [lib/auth.tsx](file://lib/auth.tsx#L1-L682)
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)

## Detailed Component Analysis

### Frontend Framework: Next.js 16, React 19, TypeScript, Tailwind CSS
- Next.js App Router: Uses app directory with pages, layouts, and API routes. Middleware enforces route access and redirects.
- React 19: Client components, context provider for authentication, and hooks for Firestore data.
- TypeScript: Compiler options enable strict checks, JSX transform, bundler resolution, and path aliases.
- Tailwind CSS: PostCSS plugin configured for Tailwind; global styles applied in root layout.

```mermaid
classDiagram
class Layout {
+metadata
+RootLayout(children)
}
class AuthProvider {
+signIn(email,password)
+signUp(email,password,fullName)
+logout()
+updateProfile(data)
}
class FirestoreHook {
+useFirestoreData(options)
+useLoanRequests(status)
+useMembers()
+useUsersWithRole(role)
}
class Sidebar {
+toggleSection(title)
+handleLogout()
}
Layout --> AuthProvider : "wraps children"
AuthProvider --> FirestoreHook : "consumes"
Sidebar --> AuthProvider : "uses"
```

**Diagram sources**
- [app/layout.tsx](file://app/layout.tsx#L1-L37)
- [lib/auth.tsx](file://lib/auth.tsx#L158-L680)
- [hooks/useFirestoreData.ts](file://hooks/useFirestoreData.ts#L19-L151)
- [components/admin/Sidebar.tsx](file://components/admin/Sidebar.tsx#L92-L279)

**Section sources**
- [app/layout.tsx](file://app/layout.tsx#L1-L37)
- [lib/auth.tsx](file://lib/auth.tsx#L1-L682)
- [hooks/useFirestoreData.ts](file://hooks/useFirestoreData.ts#L1-L182)
- [components/admin/Sidebar.tsx](file://components/admin/Sidebar.tsx#L1-L279)
- [tsconfig.json](file://tsconfig.json#L1-L35)
- [postcss.config.mjs](file://postcss.config.mjs#L1-L8)

### Backend Services: Firebase
- Firestore: Client and Admin SDKs used for queries, writes, and real-time listeners.
- Firebase Authentication: Not used for auth; custom authentication implemented via API routes and cookies.
- Hosting: Firebase Hosting configured for static assets and serverless functions.
- Security: Firestore rules currently permissive; intended for development/testing.

```mermaid
flowchart TD
Start(["Initialize Firebase"]) --> CheckEnv["Load env vars"]
CheckEnv --> InitClient["Initialize client app/db/auth"]
InitClient --> ExposeSDK["Expose Firestore/Auth SDKs"]
ExposeSDK --> End(["Ready"])
```

**Diagram sources**
- [lib/firebase.ts](file://lib/firebase.ts#L22-L60)

**Section sources**
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)
- [firebase.json](file://firebase.json#L1-L9)
- [firestore.rules](file://firestore.rules#L1-L19)

### Authentication and Authorization
- Custom auth flow: API route validates credentials against Firestore, sets cookies, and redirects to role-specific dashboards.
- Middleware enforces route access using cookies and a validator module.
- Password hashing: PBKDF2 with salt for secure storage; timing-safe comparisons.

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "POST /api/auth"
participant Admin as "Admin SDK"
participant DB as "Firestore"
participant MW as "Middleware"
Client->>API : "Credentials"
API->>Admin : "Query user by email"
Admin->>DB : "Get user"
DB-->>Admin : "User record"
API->>API : "Verify password (PBKDF2)"
API->>DB : "Update lastLogin"
API-->>Client : "{success,user,role}"
MW->>Client : "Redirect to dashboard based on role"
```

**Diagram sources**
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L264)
- [lib/auth.tsx](file://lib/auth.tsx#L197-L348)
- [middleware.ts](file://middleware.ts#L5-L56)

**Section sources**
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L1-L295)
- [lib/auth.tsx](file://lib/auth.tsx#L1-L682)
- [middleware.ts](file://middleware.ts#L1-L62)

### Real-Time Data and Scalability
- Real-time listeners: Hook subscribes to Firestore snapshots and sorts client-side for flexibility.
- No composite indexes: Filters applied without ordering to avoid index overhead.
- Scalability: Admin SDK used for serverless functions; client SDK for UI updates.

```mermaid
flowchart TD
Setup(["Setup Firestore Listener"]) --> BuildQuery["Build query with filters"]
BuildQuery --> Subscribe["Subscribe to onSnapshot"]
Subscribe --> Process["Process snapshot data"]
Process --> Sort["Client-side sort"]
Sort --> Update["Update state"]
Update --> Loop["Continue listening"]
```

**Diagram sources**
- [hooks/useFirestoreData.ts](file://hooks/useFirestoreData.ts#L65-L125)

**Section sources**
- [hooks/useFirestoreData.ts](file://hooks/useFirestoreData.ts#L1-L182)
- [lib/firebase.ts](file://lib/firebase.ts#L1-L309)

### Component Library Ecosystem
- Recharts: Used for data visualization in dashboards and reports.
- Lucide React: Used for UI icons across navigation and actions.
- Utilities: react-hook-form for forms, react-hot-toast for notifications.

**Section sources**
- [package.json](file://package.json#L16-L51)
- [components/admin/Sidebar.tsx](file://components/admin/Sidebar.tsx#L1-L279)

### API Routes and Business Logic
- Authentication: Validates credentials, checks role, updates last login, and returns JSON.
- Members: CRUD operations for member/user records with password hashing.
- Loans: CRUD operations for loan records with validation.

```mermaid
classDiagram
class AuthRoute {
+POST()
+GET()
+PUT()
+DELETE()
}
class MembersRoute {
+GET()
+POST()
+PUT()
+DELETE()
}
class LoansRoute {
+GET()
+POST()
+PUT()
+DELETE()
}
AuthRoute <.. MembersRoute : "shared Admin SDK"
AuthRoute <.. LoansRoute : "shared Admin SDK"
```

**Diagram sources**
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L48-L264)
- [app/api/members/route.ts](file://app/api/members/route.ts#L26-L179)
- [app/api/loans/route.ts](file://app/api/loans/route.ts#L5-L133)

**Section sources**
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L1-L295)
- [app/api/members/route.ts](file://app/api/members/route.ts#L1-L179)
- [app/api/loans/route.ts](file://app/api/loans/route.ts#L1-L133)

## Dependency Analysis
- Frontend dependencies: Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts, Lucide React, react-hook-form, react-hot-toast.
- Dev dependencies: ESLint, Tailwind CSS v4, TypeScript, and Next.js ESLint configs.
- Firebase: Client SDK for React; Admin SDK for serverless functions.
- Tooling: PostCSS for Tailwind; ESLint for linting; Next.js config for build options.

```mermaid
graph LR
Pkg["package.json"] --> Next["next@16"]
Pkg --> React["react@19 / react-dom@19"]
Pkg --> TS["typescript"]
Pkg --> Tailwind["tailwindcss"]
Pkg --> ESLint["eslint"]
Pkg --> Recharts["recharts"]
Pkg --> Lucide["lucide-react"]
Pkg --> Firebase["firebase / firebase-admin"]
Pkg --> Utils["react-hook-form / react-hot-toast"]
Next --> ConfigTS["tsconfig.json"]
Tailwind --> PostCSS["postcss.config.mjs"]
ESLint --> ESLintCfg["eslint.config.mjs"]
```

**Diagram sources**
- [package.json](file://package.json#L16-L51)
- [tsconfig.json](file://tsconfig.json#L1-L35)
- [postcss.config.mjs](file://postcss.config.mjs#L1-L8)
- [eslint.config.mjs](file://eslint.config.mjs#L1-L19)

**Section sources**
- [package.json](file://package.json#L1-L53)
- [tsconfig.json](file://tsconfig.json#L1-L35)
- [postcss.config.mjs](file://postcss.config.mjs#L1-L8)
- [eslint.config.mjs](file://eslint.config.mjs#L1-L19)

## Performance Considerations
- Real-time updates: Firestore onSnapshot provides efficient incremental updates; client-side sorting avoids index overhead.
- Build optimization: Next.js 16 with App Router enables fast refresh and optimized bundles.
- Styling: Tailwind CSS via PostCSS minimizes CSS payload; font optimization via Next.js reduces render-blocking resources.
- Authentication: PBKDF2 with salt ensures secure password storage; timing-safe comparisons mitigate side-channel attacks.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Firebase initialization failures: Check environment variables and console logs for initialization errors.
- Firestore permission errors: Review Firestore rules and ensure correct indexing for queries.
- Authentication errors: Verify API route JSON responses and cookie setting; confirm user role presence.
- Middleware redirects: Confirm cookie parsing and route validation logic.

**Section sources**
- [lib/firebase.ts](file://lib/firebase.ts#L57-L60)
- [firestore.rules](file://firestore.rules#L15-L18)
- [app/api/auth/route.ts](file://app/api/auth/route.ts#L250-L264)
- [middleware.ts](file://middleware.ts#L23-L39)

## Conclusion
The SAMPA Cooperative Management System combines Next.js 16, React 19, TypeScript, and Tailwind CSS for a modern, type-safe frontend, and Firebase for a scalable backend. The custom authentication flow, middleware-based routing, and real-time Firestore listeners support cooperative management needs for role-based access control and scalable user management. Development tooling ensures code quality and efficient builds, while the component library ecosystem enhances UX and maintainability.