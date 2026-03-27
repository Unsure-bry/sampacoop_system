# Database Design & Data Models

<cite>
**Referenced Files in This Document**
- [firebase.indexes.json](file://firebase.indexes.json)
- [firestore.rules](file://firestore.rules)
- [lib/firebase.ts](file://lib/firebase.ts)
- [lib/firebaseAdmin.ts](file://lib/firebaseAdmin.ts)
- [lib/userMemberService.ts](file://lib/userMemberService.ts)
- [lib/savingsService.ts](file://lib/savingsService.ts)
- [lib/activityLogger.ts](file://lib/activityLogger.ts)
- [lib/certificateService.ts](file://lib/certificateService.ts)
- [app/api/members/route.ts](file://app/api/members/route.ts)
- [app/api/loans/route.ts](file://app/api/loans/route.ts)
- [lib/types/savings.ts](file://lib/types/savings.ts)
- [components/admin/README.md](file://components/admin/README.md)
</cite>

## Update Summary
**Changes Made**
- Enhanced Firebase database utilities documentation to include the new addDocument function
- Updated savings transaction management to reflect improved nested collection support
- Added documentation for enhanced document management capabilities
- Updated data access patterns to include nested collection operations

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Enhanced Firebase Utilities](#enhanced-firebase-utilities)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)
11. [Appendices](#appendices)

## Introduction
This document describes the Firestore database design for the SAMPA Cooperative Management System. It covers the collections Users, Members, Loans, Savings, ActivityLogs, and Certificates, detailing entity relationships, field definitions, data types, indexes, and security rules. It also explains data access patterns, query optimization strategies, referential integrity enforcement, and operational considerations such as data lifecycle, security, and migration.

**Updated** Enhanced with new Firebase database utilities featuring improved nested collection support and enhanced document management capabilities.

## Project Structure
The database design is implemented via client and server-side Firestore utilities and API routes:
- Client utilities: centralized Firestore helpers for CRUD operations and queries with enhanced nested collection support
- Server utilities: Firebase Admin SDK wrapper for secure server-side operations
- Services: domain services for user-member linking, savings transactions, activity logging, and certificates
- API routes: HTTP endpoints for managing members and loans
- Indexes and rules: Firestore indexes and security rules configuration

```mermaid
graph TB
subgraph "Client-Side"
FB["lib/firebase.ts<br/>Enhanced with addDocument()"]
UMS["lib/userMemberService.ts"]
SS["lib/savingsService.ts"]
AL["lib/activityLogger.ts"]
CS["lib/certificateService.ts"]
end
subgraph "Server-Side"
FA["lib/firebaseAdmin.ts"]
AMR["app/api/members/route.ts"]
ALR["app/api/loans/route.ts"]
end
subgraph "Firestore"
IDX["firebase.indexes.json"]
RUL["firestore.rules"]
COL_USERS["Collection 'users'"]
COL_MEMBERS["Collection 'members'"]
COL_LOANS["Collection 'loans'"]
COL_SAVINGS["Subcollection 'members/{memberId}/savings'"]
COL_ACTIVITY["Collection 'activityLogs'"]
COL_CERTS["Field 'members[].certificate'"]
end
FB --> COL_USERS
FB --> COL_MEMBERS
FB --> COL_LOANS
FB --> COL_SAVINGS
FB --> COL_ACTIVITY
UMS --> COL_USERS
UMS --> COL_MEMBERS
SS --> COL_SAVINGS
SS --> COL_MEMBERS
AL --> COL_ACTIVITY
CS --> COL_CERTS
AMR --> FA
ALR --> FA
IDX --> COL_USERS
IDX --> COL_MEMBERS
IDX --> COL_LOANS
IDX --> COL_SAVINGS
IDX --> COL_ACTIVITY
RUL --> COL_USERS
RUL --> COL_MEMBERS
RUL --> COL_LOANS
RUL --> COL_SAVINGS
RUL --> COL_ACTIVITY
```

**Diagram sources**
- [lib/firebase.ts:90-307](file://lib/firebase.ts#L90-L307)
- [lib/firebaseAdmin.ts:111-266](file://lib/firebaseAdmin.ts#L111-L266)
- [lib/userMemberService.ts:23-92](file://lib/userMemberService.ts#L23-L92)
- [lib/savingsService.ts:237-342](file://lib/savingsService.ts#L237-L342)
- [lib/activityLogger.ts:20-86](file://lib/activityLogger.ts#L20-L86)
- [lib/certificateService.ts:10-175](file://lib/certificateService.ts#L10-L175)
- [app/api/members/route.ts:26-65](file://app/api/members/route.ts#L26-L65)
- [app/api/loans/route.ts:5-39](file://app/api/loans/route.ts#L5-L39)
- [firebase.indexes.json:1-83](file://firebase.indexes.json#L1-L83)
- [firestore.rules:1-19](file://firestore.rules#L1-L19)

**Section sources**
- [lib/firebase.ts:1-384](file://lib/firebase.ts#L1-L384)
- [lib/firebaseAdmin.ts:1-277](file://lib/firebaseAdmin.ts#L1-L277)
- [lib/userMemberService.ts:1-289](file://lib/userMemberService.ts#L1-L289)
- [lib/savingsService.ts:1-669](file://lib/savingsService.ts#L1-L669)
- [lib/activityLogger.ts:1-165](file://lib/activityLogger.ts#L1-L165)
- [lib/certificateService.ts:1-207](file://lib/certificateService.ts#L1-L207)
- [app/api/members/route.ts:1-179](file://app/api/members/route.ts#L1-L179)
- [app/api/loans/route.ts:1-133](file://app/api/loans/route.ts#L1-L133)
- [firebase.indexes.json:1-83](file://firebase.indexes.json#L1-L83)
- [firestore.rules:1-19](file://firestore.rules#L1-L19)

## Core Components
- Users collection: stores user accounts with authentication-related fields and roles.
- Members collection: stores member profiles with personal details, status, and a link to the user account.
- Loans collection: stores loan applications/records with metadata and status.
- Savings subcollections: per-member transactional ledger under members/{memberId}/savings.
- ActivityLogs collection: audit trail of user actions with timestamps.
- Certificates: embedded certificate data stored in each member's document.

**Section sources**
- [lib/userMemberService.ts:23-92](file://lib/userMemberService.ts#L23-L92)
- [lib/savingsService.ts:237-342](file://lib/savingsService.ts#L237-L342)
- [lib/activityLogger.ts:20-86](file://lib/activityLogger.ts#L20-L86)
- [lib/certificateService.ts:10-175](file://lib/certificateService.ts#L10-L175)
- [app/api/members/route.ts:67-158](file://app/api/members/route.ts#L67-L158)
- [app/api/loans/route.ts:42-112](file://app/api/loans/route.ts#L42-L112)

## Architecture Overview
The system uses a hybrid approach:
- Client utilities for UI-driven operations (CRUD and queries) with enhanced nested collection support
- Server utilities for privileged operations (Admin SDK)
- Domain services enforce referential integrity and business rules
- API routes expose controlled endpoints for administrative tasks

```mermaid
sequenceDiagram
participant UI as "Client UI"
participant FB as "lib/firebase.ts<br/>Enhanced addDocument()"
participant UMS as "lib/userMemberService.ts"
participant SS as "lib/savingsService.ts"
participant AL as "lib/activityLogger.ts"
participant CS as "lib/certificateService.ts"
participant FA as "lib/firebaseAdmin.ts"
participant API as "app/api/* routes"
UI->>FB : addDocument()/setDocument()/getDocument()
UI->>UMS : createLinkedUserMember()/validateAndHealUserMemberLink()
UI->>SS : addSavingsTransaction()/getUserSavingsTransactions()
UI->>AL : logActivity()/getUserActivityLogs()
UI->>CS : generateMembershipCertificate()/getMemberCertificate()
API->>FA : setDocument/getCollection/queryDocuments
API->>UMS : cross-check user-member linkage
```

**Diagram sources**
- [lib/firebase.ts:90-307](file://lib/firebase.ts#L90-L307)
- [lib/userMemberService.ts:23-92](file://lib/userMemberService.ts#L23-L92)
- [lib/savingsService.ts:237-342](file://lib/savingsService.ts#L237-L342)
- [lib/activityLogger.ts:20-86](file://lib/activityLogger.ts#L20-L86)
- [lib/certificateService.ts:10-175](file://lib/certificateService.ts#L10-L175)
- [lib/firebaseAdmin.ts:111-266](file://lib/firebaseAdmin.ts#L111-L266)
- [app/api/members/route.ts:26-65](file://app/api/members/route.ts#L26-L65)
- [app/api/loans/route.ts:5-39](file://app/api/loans/route.ts#L5-L39)

## Detailed Component Analysis

### Users Collection
- Purpose: Authentication and identity for all users.
- Primary key: Document ID equals the normalized email (URL-encoded lowercase).
- Typical fields:
  - email: string
  - displayName: string
  - role: string (lowercased)
  - createdAt: string (ISO timestamp)
  - isPasswordSet: boolean
  - passwordHash: string (when applicable)
  - salt: string (when applicable)
- Access pattern: Created during registration; linked to member via userId.
- Security: Current rules allow read/write for all; recommended to restrict by auth rules.

**Section sources**
- [lib/userMemberService.ts:14-47](file://lib/userMemberService.ts#L14-L47)
- [lib/userMemberService.ts:23-92](file://lib/userMemberService.ts#L23-L92)
- [app/api/members/route.ts:67-158](file://app/api/members/route.ts#L67-L158)
- [firestore.rules:15-17](file://firestore.rules#L15-L17)

### Members Collection
- Purpose: Member profile and aggregate data (e.g., savings total).
- Primary key: Same as user ID (URL-encoded email).
- Typical fields:
  - firstName, lastName, middleName, suffix: string
  - fullName: string
  - email: string
  - phoneNumber: string
  - birthdate: string
  - role: string
  - driverInfo/operatorInfo/paymentInfo: object|null
  - status: string
  - userId: string (links to Users)
  - savings: object with total and lastUpdated
  - certificate: object|null (certificate metadata)
  - createdAt, updatedAt: string (ISO timestamps)
- Referential integrity: Enforced by generating identical IDs for users and members and maintaining userId consistency.

**Section sources**
- [lib/userMemberService.ts:55-73](file://lib/userMemberService.ts#L55-L73)
- [lib/userMemberService.ts:105-198](file://lib/userMemberService.ts#L105-L198)
- [lib/savingsService.ts:313-335](file://lib/savingsService.ts#L313-L335)
- [lib/certificateService.ts:142-161](file://lib/certificateService.ts#L142-L161)

### Loans Collection
- Purpose: Loan records with lifecycle metadata.
- Primary key: Generated unique ID (loan_{timestamp}_{random}).
- Typical fields:
  - memberId: string (foreign key to Members)
  - amount: number
  - interestRate: number
  - term: integer
  - startDate: string (ISO timestamp)
  - status: string
  - createdAt: string (ISO timestamp)
- Access pattern: Admin endpoints create/update; clients read aggregated lists.

**Section sources**
- [app/api/loans/route.ts:42-112](file://app/api/loans/route.ts#L42-L112)

### Savings Subcollections
- Location: members/{memberId}/savings
- Purpose: Per-member transactional ledger.
- Typical fields per transaction:
  - id: string (composed type-timestamp-suffix)
  - type: string ("deposit"|"withdrawal")
  - amount: number
  - date: string (ISO timestamp)
  - balance: number (running balance)
  - createdAt: string (ISO timestamp)
- Aggregate: members.{savings.total,lastUpdated} maintained by service.

**Updated** Enhanced with improved nested collection support through the new addDocument function, enabling more flexible document creation in subcollections.

```mermaid
flowchart TD
Start(["Add Savings Transaction"]) --> GetMember["Resolve memberId from userId"]
GetMember --> Exists{"Member Found?"}
Exists -- No --> Error["Return Error"]
Exists -- Yes --> LoadTx["Load Existing Transactions"]
LoadTx --> Calc["Compute Running Balance"]
Calc --> Validate{"Withdrawal <= Balance?"}
Validate -- No --> Insuf["Return Insufficient Funds"]
Validate -- Yes --> SaveTx["Enhanced: Use addDocument() for nested collection"]
SaveTx --> UpdateMember["Update Member Savings Total"]
UpdateMember --> Done(["Success"])
```

**Diagram sources**
- [lib/savingsService.ts:237-342](file://lib/savingsService.ts#L237-L342)
- [lib/firebase.ts:92-128](file://lib/firebase.ts#L92-L128)

**Section sources**
- [lib/savingsService.ts:237-342](file://lib/savingsService.ts#L237-L342)
- [lib/savingsService.ts:347-422](file://lib/savingsService.ts#L347-L422)
- [lib/types/savings.ts:1-22](file://lib/types/savings.ts#L1-L22)
- [components/admin/README.md:16-29](file://components/admin/README.md#L16-L29)

### ActivityLogs Collection
- Purpose: Audit trail of user actions.
- Typical fields:
  - userId: string
  - userEmail, userName: string
  - action: string
  - timestamp: string (ISO timestamp)
  - ipAddress, userAgent, role: string
- Queries: By userId with descending timestamp; global listing by timestamp ascending.

**Section sources**
- [lib/activityLogger.ts:20-86](file://lib/activityLogger.ts#L20-L86)
- [lib/activityLogger.ts:88-165](file://lib/activityLogger.ts#L88-L165)

### Certificates
- Storage: Embedded in the member document under certificate.
- Fields:
  - memberId: string
  - fullName: string
  - role: string
  - registrationDate: string
  - certificateUrl: string (data URI)
  - createdAt: string (ISO timestamp)
- Generation: Service creates PDF and updates member document.

**Section sources**
- [lib/certificateService.ts:10-175](file://lib/certificateService.ts#L10-L175)

## Enhanced Firebase Utilities

**Updated** The Firebase utilities have been significantly enhanced with a new addDocument function that provides improved support for nested collections and enhanced document management capabilities.

### New addDocument Function
The enhanced addDocument function in lib/firebase.ts provides sophisticated nested collection support:

- **Nested Path Support**: Handles complex collection paths like 'members/123/savings'
- **Validation**: Validates Firestore connection and input parameters
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Return Values**: Returns structured responses with success status and error details

```mermaid
flowchart TD
Start(["addDocument() Called"]) --> Validate["Validate Firestore Connection"]
Validate --> PathCheck{"Is Path Simple?<br/>(single collection)"}
PathCheck -- Yes --> Simple["Use collection() directly"]
PathCheck -- No --> Nested{"Is Path Nested?<br/>(members/{id}/savings)"}
Nested -- Yes --> Parent["Resolve Parent Document Reference"]
Parent --> Child["Create Child Collection Reference"]
Child --> AddDoc["Execute addDoc()"]
Nested -- No --> Error["Throw Invalid Path Error"]
Simple --> AddDoc
AddDoc --> Success["Return Success with Document ID"]
Error --> Fail["Return Error Response"]
Fail --> End(["End"])
Success --> End
```

**Diagram sources**
- [lib/firebase.ts:92-128](file://lib/firebase.ts#L92-L128)

### Enhanced Document Management
The new function enables more flexible document creation patterns:

- **Simple Collections**: Direct collection operations (e.g., 'users', 'members')
- **Nested Collections**: Hierarchical operations (e.g., 'members/{memberId}/savings')
- **Consistent Interface**: Unified API for different collection types
- **Improved Error Reporting**: Detailed error messages for debugging

**Section sources**
- [lib/firebase.ts:92-128](file://lib/firebase.ts#L92-L128)

## Dependency Analysis
- Referential integrity:
  - Users and Members share the same ID to guarantee a single source of truth.
  - Savings subcollections are scoped under members/{memberId}, enforcing hierarchical containment.
- Cross-collection dependencies:
  - Savings service resolves memberId from userId to maintain referential integrity.
  - Activity logger writes userId to activityLogs; indexes enable efficient queries.
- API routes depend on Admin SDK for privileged operations.

```mermaid
erDiagram
USERS {
string id PK
string email
string displayName
string role
string createdAt
boolean isPasswordSet
}
MEMBERS {
string id PK
string firstName
string lastName
string middleName
string suffix
string fullName
string email
string phoneNumber
string birthdate
string role
string status
string userId FK
object savings
object certificate
string createdAt
string updatedAt
}
LOANS {
string id PK
string memberId FK
number amount
number interestRate
number term
string startDate
string status
string createdAt
}
ACTIVITYLOGS {
string id PK
string userId FK
string userEmail
string userName
string action
string timestamp
string ipAddress
string userAgent
string role
}
MEMBERS ||--|| USERS : "userId links to"
MEMBERS ||--o{ ACTIVITYLOGS : "audit via userId"
MEMBERS ||--o{ LOANS : "memberId links to"
```

**Diagram sources**
- [lib/userMemberService.ts:55-73](file://lib/userMemberService.ts#L55-L73)
- [lib/savingsService.ts:237-342](file://lib/savingsService.ts#L237-L342)
- [lib/activityLogger.ts:20-86](file://lib/activityLogger.ts#L20-L86)
- [app/api/loans/route.ts:42-112](file://app/api/loans/route.ts#L42-L112)

**Section sources**
- [lib/userMemberService.ts:1-289](file://lib/userMemberService.ts#L1-L289)
- [lib/savingsService.ts:1-669](file://lib/savingsService.ts#L1-L669)
- [lib/activityLogger.ts:1-165](file://lib/activityLogger.ts#L1-L165)
- [app/api/loans/route.ts:1-133](file://app/api/loans/route.ts#L1-L133)

## Performance Considerations
- Indexes:
  - loanRequests: composite indexes on status+createdAt/__name__ and status+approvedAt/__name__ and status+rejectedAt/__name__.
  - activityLogs: composite index on userId+timestamp and single-field index on timestamp.
- Query optimization:
  - Use userId+timestamp for per-user audit queries.
  - Use timestamp-only for global audit listings.
  - Prefer filtering by equality on indexed fields to leverage composite indexes.
- Data modeling:
  - Embedding certificate data in members reduces joins.
  - Savings transactions stored as subcollection enable scalable pagination and aggregation.

**Section sources**
- [firebase.indexes.json:1-83](file://firebase.indexes.json#L1-L83)
- [lib/activityLogger.ts:50-120](file://lib/activityLogger.ts#L50-L120)

## Troubleshooting Guide
- Permission denied errors:
  - Current rules allow read/write for all; if access is denied, verify client initialization and network connectivity.
- Document not found:
  - Ensure IDs are URL-encoded emails for Users/Members.
  - Confirm user-member linkage exists and is consistent.
- Savings validation failures:
  - Withdrawals exceeding balance are rejected; confirm deposit/withdrawal amounts and order of transactions.
- Certificate generation:
  - Ensure member document has required fields; verify update succeeded.
- **New** Enhanced nested collection issues:
  - Verify collection path format follows 'parent/child/grandchild' pattern.
  - Ensure parent document exists before creating child collections.
  - Check that path parts are correctly formatted and accessible.

**Section sources**
- [lib/firebase.ts:174-180](file://lib/firebase.ts#L174-L180)
- [lib/savingsService.ts:292-294](file://lib/savingsService.ts#L292-L294)
- [lib/certificateService.ts:158-161](file://lib/certificateService.ts#L158-L161)
- [firestore.rules:15-17](file://firestore.rules#L15-L17)

## Conclusion
The database design centers on a consistent identity model (Users and Members sharing IDs), hierarchical savings subcollections, and embedded certificate data. Indexes and service-layer validations support efficient queries and business rule enforcement. Security rules currently permit broad access and should be hardened to enforce role-based access and data isolation.

**Updated** The enhanced Firebase utilities with the new addDocument function provide improved nested collection support and more robust document management capabilities, enabling more flexible data operations while maintaining referential integrity and performance standards.

## Appendices

### Data Access Patterns and Examples
- Create linked user-member:
  - Generate ID from email; create user; create member with userId; rollback on failure.
- Add savings transaction:
  - Resolve memberId from userId; compute running balance; persist transaction with enhanced addDocument support; update member savings total.
- Log activity:
  - Insert activity log with timestamp; query by userId or globally by timestamp.
- Generate certificate:
  - Create PDF; embed base64 data; update member certificate field.

**Section sources**
- [lib/userMemberService.ts:23-92](file://lib/userMemberService.ts#L23-L92)
- [lib/savingsService.ts:237-342](file://lib/savingsService.ts#L237-L342)
- [lib/activityLogger.ts:20-86](file://lib/activityLogger.ts#L20-L86)
- [lib/certificateService.ts:10-175](file://lib/certificateService.ts#L10-L175)

### Security and Privacy
- Current rules: Allow read/write for all documents.
- Recommended improvements:
  - Restrict reads/writes by authenticated user and role.
  - Separate sensitive fields (e.g., passwordHash) behind role gates.
  - Enforce field-level visibility for member data.

**Section sources**
- [firestore.rules:15-17](file://firestore.rules#L15-L17)

### Data Lifecycle, Retention, and Archival
- No explicit retention policies are defined in the repository.
- Suggested practices:
  - Archive old activity logs periodically to reduce cost and improve query performance.
  - Implement member deactivation workflows and data anonymization for inactive users.
  - Back up critical collections regularly and test restore procedures.

### Migration and Versioning
- Schema changes:
  - Introduce version fields in documents to support gradual rollout.
  - Use server-side migrations to backfill defaults and transform data.
- Index changes:
  - Add new composite indexes via firebase.indexes.json and deploy using CLI.
- Validation:
  - Add pre/post hooks to validate data shape and enforce constraints.