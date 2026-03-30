# Member Dashboard Interface

<cite>
**Referenced Files in This Document**
- [app/dashboard/page.tsx](file://app/dashboard/page.tsx)
- [components/user/DynamicDashboard.tsx](file://components/user/DynamicDashboard.tsx)
- [components/user/ActiveLoans.tsx](file://components/user/ActiveLoans.tsx)
- [components/user/ActiveSavings.tsx](file://components/user/ActiveSavings.tsx)
- [hooks/useCapitalShare.ts](file://hooks/useCapitalShare.ts)
- [components/shared/Card.tsx](file://components/shared/Card.tsx)
- [lib/savingsService.ts](file://lib/savingsService.ts)
- [lib/firebase.ts](file://lib/firebase.ts)
- [lib/auth.tsx](file://lib/auth.tsx)
- [hooks/useFirestoreData.ts](file://hooks/useFirestoreData.ts)
- [lib/types/savings.ts](file://lib/types/savings.ts)
- [middleware.ts](file://middleware.ts)
- [app/layout.tsx](file://app/layout.tsx)
</cite>

## Update Summary
**Changes Made**
- Updated capital share display logic to show remaining balance for incomplete payments and total paid amount for fully paid members
- Enhanced capital share information presentation with improved conditional rendering
- Added refined status indicators and visual feedback for capital share payment status
- Updated dashboard sections to reflect the new capital share display patterns

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
This document provides comprehensive documentation for the Member Dashboard interface that delivers personalized financial information to cooperative members. The dashboard dynamically adapts content based on member account status and loan eligibility, displaying active loans with payment schedules and due dates, and showcasing active savings accounts with balances, transaction history, and contribution summaries. The system now features refined capital share information display that clearly communicates payment status through conditional formatting and status indicators. It integrates real-time data synchronization from Firestore collections, supports member-specific navigation and quick-access features, and implements responsive design patterns for mobile-friendly access. The documentation also covers customization examples, data privacy considerations, and secure information display patterns.

## Project Structure
The Member Dashboard is built as a Next.js application with a modular component architecture. Key areas include:
- Dashboard page orchestrating member-specific content with refined capital share display
- Dynamic dashboard wrapper for role-aware content
- Financial components for loans and savings
- Capital share management with payment status tracking
- Shared UI components and services for data access
- Authentication and middleware for role-based routing
- Real-time Firestore integration utilities

```mermaid
graph TB
subgraph "Client Application"
Layout["Root Layout<br/>AuthProvider"]
Middleware["Middleware<br/>Route Validation"]
DashboardPage["Dashboard Page<br/>Member View"]
DynamicWrapper["Dynamic Dashboard Wrapper"]
ActiveLoans["Active Loans Component"]
ActiveSavings["Active Savings Component"]
CapitalShareHook["useCapitalShare Hook<br/>Payment Status Tracking"]
NotificationBell["Notification Bell"]
end
subgraph "Services & Utilities"
Auth["Auth Service<br/>Role Resolution"]
Firebase["Firebase Utils<br/>Firestore Operations"]
SavingsSvc["Savings Service<br/>Member Linking"]
HookFS["useFirestoreData Hook<br/>Real-time Listener"]
end
subgraph "Data Layer"
Firestore["Firestore Collections"]
Members["members"]
Savings["savings"]
Loans["loans"]
CapitalShare["capitalShareTransactions"]
Reminders["reminders"]
Events["events"]
Notifications["notifications"]
end
Layout --> Middleware
Middleware --> DashboardPage
DashboardPage --> DynamicWrapper
DashboardPage --> ActiveSavings
DashboardPage --> ActiveLoans
DashboardPage --> CapitalShareHook
DashboardPage --> NotificationBell
ActiveSavings --> SavingsSvc
ActiveLoans --> Firebase
DynamicWrapper --> Firebase
CapitalShareHook --> Firebase
SavingsSvc --> Firebase
HookFS --> Firebase
Firebase --> Firestore
Firestore --> Members
Firestore --> Savings
Firestore --> Loans
Firestore --> CapitalShare
Firestore --> Reminders
Firestore --> Events
Firestore --> Notifications
```

**Diagram sources**
- [app/layout.tsx:22-37](file://app/layout.tsx#L22-L37)
- [middleware.ts:5-62](file://middleware.ts#L5-L62)
- [app/dashboard/page.tsx:11-312](file://app/dashboard/page.tsx#L11-L312)
- [components/user/DynamicDashboard.tsx:36-149](file://components/user/DynamicDashboard.tsx#L36-L149)
- [components/user/ActiveLoans.tsx:19-177](file://components/user/ActiveLoans.tsx#L19-L177)
- [components/user/ActiveSavings.tsx:16-270](file://components/user/ActiveSavings.tsx#L16-L270)
- [hooks/useCapitalShare.ts:1-143](file://hooks/useCapitalShare.ts#L1-L143)
- [lib/firebase.ts:89-309](file://lib/firebase.ts#L89-L309)
- [lib/savingsService.ts:21-135](file://lib/savingsService.ts#L21-L135)

**Section sources**
- [app/dashboard/page.tsx:1-910](file://app/dashboard/page.tsx#L1-L910)
- [components/user/DynamicDashboard.tsx:1-149](file://components/user/DynamicDashboard.tsx#L1-L149)
- [components/user/ActiveLoans.tsx:1-177](file://components/user/ActiveLoans.tsx#L1-L177)
- [components/user/ActiveSavings.tsx:1-270](file://components/user/ActiveSavings.tsx#L1-L270)
- [hooks/useCapitalShare.ts:1-143](file://hooks/useCapitalShare.ts#L1-L143)
- [lib/firebase.ts:1-309](file://lib/firebase.ts#L1-L309)
- [lib/savingsService.ts:1-455](file://lib/savingsService.ts#L1-L455)
- [middleware.ts:1-62](file://middleware.ts#L1-L62)
- [app/layout.tsx:1-37](file://app/layout.tsx#L1-L37)

## Core Components
This section outlines the primary building blocks of the Member Dashboard and their responsibilities.

- Dashboard Page
  - Orchestrates member-specific content, including savings summary, notifications, and role-aware sections
  - Integrates with authentication to ensure only members access the dashboard
  - Implements real-time savings aggregation and notification checks
  - **Updated**: Features refined capital share display showing remaining balance for incomplete payments and total paid amount for fully paid members

- Dynamic Dashboard Wrapper
  - Provides role-aware reminders and events for all users
  - Filters content by user role and status
  - Sorts and renders upcoming reminders and events

- Active Loans Component
  - Displays current active loans with principal, term, interest rate, and start date
  - Shows payment schedule details including monthly payment and next payment date
  - Handles loading states, errors, and retry mechanisms

- Active Savings Component
  - Renders recent savings transactions with type, amount, and running balance
  - Supports both compact and detailed views for dashboard integration
  - Implements automatic refresh on visibility change and manual refresh controls

- Capital Share Hook
  - **New**: Manages capital share payment status with refined display logic
  - Tracks required amount, paid amount, remaining balance, and payment status
  - Provides real-time updates for capital share payment progress

- Savings Service
  - Links user IDs to member records across multiple lookup strategies
  - Manages atomic savings transactions with balance calculations
  - Provides cached and calculated balance retrieval

**Section sources**
- [app/dashboard/page.tsx:11-910](file://app/dashboard/page.tsx#L11-L910)
- [components/user/DynamicDashboard.tsx:36-149](file://components/user/DynamicDashboard.tsx#L36-L149)
- [components/user/ActiveLoans.tsx:19-177](file://components/user/ActiveLoans.tsx#L19-L177)
- [components/user/ActiveSavings.tsx:16-270](file://components/user/ActiveSavings.tsx#L16-L270)
- [hooks/useCapitalShare.ts:24-143](file://hooks/useCapitalShare.ts#L24-L143)
- [lib/savingsService.ts:21-135](file://lib/savingsService.ts#L21-L135)

## Architecture Overview
The Member Dashboard follows a client-side rendered Next.js architecture with real-time Firestore integration. The system enforces role-based access control through middleware and authentication providers, ensuring members only access their designated dashboard. Data flows from Firestore collections through service utilities and hooks to UI components, with caching and fallback strategies for reliability. The architecture now includes refined capital share management with conditional display logic based on payment status.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Middleware as "Middleware"
participant Auth as "Auth Provider"
participant Dashboard as "Dashboard Page"
participant CapitalShareHook as "useCapitalShare Hook"
participant Firebase as "Firebase Utils"
participant Firestore as "Firestore"
Browser->>Middleware : Request /dashboard
Middleware->>Middleware : Validate cookies and role
Middleware-->>Browser : Redirect or allow access
Browser->>Auth : Initialize Auth Provider
Auth-->>Browser : Provide user context
Browser->>Dashboard : Render dashboard
Dashboard->>CapitalShareHook : Fetch capital share data
CapitalShareHook->>Firebase : Query member and transactions
Firebase->>Firestore : getDocument + getCollection
Firestore-->>Firebase : Member and transaction data
Firebase-->>CapitalShareHook : Processed capital share info
CapitalShareHook-->>Dashboard : Status and payment info
Dashboard-->>Browser : Render refined capital share display
```

**Diagram sources**
- [middleware.ts:5-62](file://middleware.ts#L5-L62)
- [lib/auth.tsx:158-682](file://lib/auth.tsx#L158-L682)
- [app/dashboard/page.tsx:37-125](file://app/dashboard/page.tsx#L37-L125)
- [hooks/useCapitalShare.ts:35-128](file://hooks/useCapitalShare.ts#L35-L128)
- [lib/firebase.ts:149-240](file://lib/firebase.ts#L149-L240)

## Detailed Component Analysis

### Dashboard Page: Member-Specific Content Orchestration
The dashboard page serves as the central hub for member financial information. It performs role validation, fetches savings data, manages notifications, and renders role-aware sections with refined capital share display logic.

Key capabilities:
- Role validation ensuring only members access the dashboard
- Savings data aggregation from member subcollections and main collections
- Notification bell with unread status indicators
- Conditional rendering of member-specific components
- **Updated**: Refined capital share display showing remaining balance for incomplete payments and total paid amount for fully paid members

```mermaid
flowchart TD
Start(["Dashboard Mount"]) --> CheckAuth["Check Authentication"]
CheckAuth --> IsMember{"Is User Role 'member'?"}
IsMember --> |No| BlockAccess["Block Access"]
IsMember --> |Yes| FetchCapitalShare["Fetch Capital Share Data"]
FetchCapitalShare --> FetchSavings["Fetch Savings Data"]
FetchSavings --> QueryMembers["Query members by userId"]
QueryMembers --> FoundMember{"Member Found?"}
FoundMember --> |No| DefaultValues["Set Default Values"]
FoundMember --> |Yes| QuerySavings["Query savings by memberId"]
QuerySavings --> AggregateData["Aggregate Totals & Last Transaction"]
AggregateData --> RenderUI["Render Dashboard UI with Refined Capital Share"]
DefaultValues --> RenderUI
RenderUI --> Notifications["Load Notifications"]
Notifications --> End(["Ready"])
```

**Diagram sources**
- [app/dashboard/page.tsx:11-125](file://app/dashboard/page.tsx#L11-L125)

**Section sources**
- [app/dashboard/page.tsx:11-910](file://app/dashboard/page.tsx#L11-L910)

### Dynamic Dashboard Wrapper: Role-Aware Content Delivery
The dynamic dashboard wrapper provides a flexible container for role-specific content, handling reminders and events with filtering and sorting logic.

Implementation highlights:
- Real-time fetching of reminders and events from Firestore
- Role-based filtering supporting 'all' and specific roles
- Status filtering for active/published content
- Priority and due date sorting for reminders
- Upcoming event filtering based on current date

```mermaid
classDiagram
class DynamicDashboard {
+user : AppUser
+reminders : Reminder[]
+events : Event[]
+loadingData : boolean
+fetchDynamicData() void
}
class Reminder {
+id : string
+title : string
+description : string
+status : string
+dueDate : string
+priority : "low"|"medium"|"high"
}
class Event {
+id : string
+title : string
+description : string
+date : string
+location : string
+status : string
+applicableTo : string[]
}
DynamicDashboard --> Reminder : "manages"
DynamicDashboard --> Event : "manages"
```

**Diagram sources**
- [components/user/DynamicDashboard.tsx:36-149](file://components/user/DynamicDashboard.tsx#L36-L149)

**Section sources**
- [components/user/DynamicDashboard.tsx:36-149](file://components/user/DynamicDashboard.tsx#L36-L149)

### Active Loans Component: Current Loan Balances and Schedules
The active loans component displays member's current loan portfolio with detailed payment information and schedule summaries.

Core functionality:
- Real-time query of active loans filtered by user ID
- Currency and date formatting for Philippine Peso and local formats
- Payment schedule calculation and display
- Comprehensive error handling and retry mechanisms

```mermaid
sequenceDiagram
participant Dashboard as "Dashboard"
participant Loans as "ActiveLoans Component"
participant Firebase as "Firebase Utils"
participant Firestore as "Firestore"
Dashboard->>Loans : Render ActiveLoans
Loans->>Firebase : queryDocuments("loans", userId, status="active")
Firebase->>Firestore : Execute query
Firestore-->>Firebase : Loan documents
Firebase-->>Loans : Processed loan data
Loans->>Loans : Format currency & dates
Loans-->>Dashboard : Render loan cards
```

**Diagram sources**
- [components/user/ActiveLoans.tsx:31-72](file://components/user/ActiveLoans.tsx#L31-L72)
- [lib/firebase.ts:184-240](file://lib/firebase.ts#L184-L240)

**Section sources**
- [components/user/ActiveLoans.tsx:19-177](file://components/user/ActiveLoans.tsx#L19-L177)

### Active Savings Component: Transaction History and Balances
The active savings component provides comprehensive savings account information with real-time updates and refresh capabilities.

Features:
- Integration with savings service for member linking and balance calculation
- Automatic refresh on tab visibility change
- Compact and detailed view modes for different contexts
- Recent transaction table with type badges and amount formatting

```mermaid
flowchart TD
Mount["Component Mount"] --> CheckAuth["Check Authentication"]
CheckAuth --> HasUser{"User Authenticated?"}
HasUser --> |No| CompactView["Show Compact Placeholder"]
HasUser --> |Yes| FetchData["Fetch Savings Data"]
FetchData --> GetMember["Get Member ID by User ID"]
GetMember --> GetUserTxns["getUserSavingsTransactions()"]
GetUserTxns --> GetUserBalance["getUserSavingsBalance()"]
GetUserBalance --> SortTxns["Sort Transactions Descending"]
SortTxns --> RenderUI["Render Savings UI"]
RenderUI --> Visibility["Listen for Visibility Change"]
Visibility --> AutoRefresh["Auto-refresh on visibility"]
```

**Diagram sources**
- [components/user/ActiveSavings.tsx:22-82](file://components/user/ActiveSavings.tsx#L22-L82)
- [lib/savingsService.ts:347-377](file://lib/savingsService.ts#L347-L377)

**Section sources**
- [components/user/ActiveSavings.tsx:16-270](file://components/user/ActiveSavings.tsx#L16-L270)
- [lib/savingsService.ts:347-422](file://lib/savingsService.ts#L347-L422)

### Capital Share Hook: Refined Payment Status Management
The capital share hook implements sophisticated payment status tracking with refined display logic that adapts based on member payment progress.

Key processes:
- Multi-strategy member ID resolution from user ID
- Real-time calculation of paid amount from both member records and transaction history
- Conditional display logic showing remaining balance for incomplete payments and total paid amount for fully paid members
- Comprehensive status tracking with 'Paid', 'Partial', and 'Pending' states
- Enhanced error handling and loading states

```mermaid
flowchart TD
Start(["useCapitalShare Hook"]) --> CheckUserId["Check User ID"]
CheckUserId --> HasUserId{"User ID Exists?"}
HasUserId --> |No| SetDefaults["Set Default Values"]
HasUserId --> |Yes| GetMemberId["Get Member ID"]
GetMemberId --> FetchMemberData["Fetch Member Data"]
FetchMemberData --> FetchTransactions["Fetch Transaction History"]
FetchTransactions --> CalculatePaidAmount["Calculate Paid Amount"]
CalculatePaidAmount --> CompareSources["Compare Member & Transaction Data"]
CompareSources --> DetermineStatus["Determine Payment Status"]
DetermineStatus --> SetCapitalShare["Set Capital Share Info"]
SetDefaults --> End(["Ready"])
SetCapitalShare --> End
```

**Diagram sources**
- [hooks/useCapitalShare.ts:35-128](file://hooks/useCapitalShare.ts#L35-L128)

**Section sources**
- [hooks/useCapitalShare.ts:1-143](file://hooks/useCapitalShare.ts#L1-L143)

### Savings Service: Member Linking and Atomic Transactions
The savings service implements robust member-to-user linking and atomic transaction processing with balance validation.

Key processes:
- Multi-strategy member ID resolution from user ID
- Atomic transaction creation with running balance calculation
- Member document aggregation updates with fallback calculations
- Comprehensive error handling and logging

```mermaid
flowchart TD
Start(["Add Savings Transaction"]) --> GetMember["getMemberIdByUserId(userId)"]
GetMember --> FoundMember{"Member Found?"}
FoundMember --> |No| ReturnError["Return Error: Member Not Found"]
FoundMember --> |Yes| LoadExisting["Load Existing Transactions"]
LoadExisting --> CalcBalance["Calculate Running Balance"]
CalcBalance --> ValidateWithdrawal{"Validate Withdrawal"}
ValidateWithdrawal --> |Insufficient Funds| ReturnError
ValidateWithdrawal --> |Valid| SaveTxn["Save Transaction with Balance"]
SaveTxn --> UpdateMember["Update Member Total Savings"]
UpdateMember --> Success["Return Success"]
```

**Diagram sources**
- [lib/savingsService.ts:237-342](file://lib/savingsService.ts#L237-L342)

**Section sources**
- [lib/savingsService.ts:21-455](file://lib/savingsService.ts#L21-L455)
- [lib/types/savings.ts:1-20](file://lib/types/savings.ts#L1-L20)

### Real-Time Data Synchronization: Firestore Integration
The application leverages Firestore for real-time data synchronization through custom hooks and utility functions.

Integration patterns:
- Real-time listeners with client-side sorting for performance
- Query-based data fetching with comprehensive error handling
- Utility functions for document CRUD operations with validation
- Index-free queries using client-side sorting where possible

**Section sources**
- [hooks/useFirestoreData.ts:19-151](file://hooks/useFirestoreData.ts#L19-L151)
- [lib/firebase.ts:89-309](file://lib/firebase.ts#L89-L309)

## Dependency Analysis
The Member Dashboard exhibits strong separation of concerns with clear dependency relationships:

```mermaid
graph TB
subgraph "Presentation Layer"
DashboardPage["Dashboard Page"]
DynamicWrapper["Dynamic Dashboard"]
ActiveLoans["Active Loans"]
ActiveSavings["Active Savings"]
CapitalShareHook["useCapitalShare Hook"]
Card["Shared Card"]
end
subgraph "Business Logic"
Auth["Auth Service"]
SavingsSvc["Savings Service"]
Validators["Route Validators"]
end
subgraph "Data Access"
HookFS["useFirestoreData"]
Firebase["Firebase Utils"]
end
subgraph "External Systems"
Firestore["Firestore"]
Cookies["HTTP Cookies"]
end
DashboardPage --> DynamicWrapper
DashboardPage --> ActiveSavings
DashboardPage --> ActiveLoans
DashboardPage --> CapitalShareHook
ActiveSavings --> SavingsSvc
ActiveLoans --> Firebase
DynamicWrapper --> Firebase
CapitalShareHook --> Firebase
DashboardPage --> Auth
Auth --> Validators
Auth --> Cookies
SavingsSvc --> Firebase
HookFS --> Firebase
Firebase --> Firestore
```

**Diagram sources**
- [app/dashboard/page.tsx:3-10](file://app/dashboard/page.tsx#L3-L10)
- [components/user/DynamicDashboard.tsx:3-6](file://components/user/DynamicDashboard.tsx#L3-L6)
- [components/user/ActiveLoans.tsx:3-6](file://components/user/ActiveLoans.tsx#L3-L6)
- [components/user/ActiveSavings.tsx:3-10](file://components/user/ActiveSavings.tsx#L3-L10)
- [hooks/useCapitalShare.ts:1-3](file://hooks/useCapitalShare.ts#L1-L3)
- [lib/auth.tsx:158-682](file://lib/auth.tsx#L158-L682)
- [lib/savingsService.ts:1-455](file://lib/savingsService.ts#L1-L455)
- [hooks/useFirestoreData.ts:1-182](file://hooks/useFirestoreData.ts#L1-L182)
- [lib/firebase.ts:1-309](file://lib/firebase.ts#L1-L309)

**Section sources**
- [lib/auth.tsx:111-156](file://lib/auth.tsx#L111-L156)
- [middleware.ts:47-55](file://middleware.ts#L47-L55)
- [app/dashboard/page.tsx:11-910](file://app/dashboard/page.tsx#L11-L910)

## Performance Considerations
The dashboard implements several performance optimizations:

- Real-time listeners with client-side sorting to avoid composite index requirements
- Automatic refresh on tab visibility change to keep data fresh without constant polling
- Caching strategies through member document aggregations for savings totals
- Efficient query patterns with role-based filtering to minimize data transfer
- Responsive design patterns ensuring optimal mobile performance
- **Updated**: Optimized capital share display logic to reduce unnecessary re-renders through conditional rendering

## Troubleshooting Guide
Common issues and resolutions:

### Authentication and Authorization
- Verify user role cookies are properly set after login
- Check middleware route validation for unauthorized access attempts
- Ensure role-based redirection occurs correctly after authentication

### Data Loading Issues
- Monitor Firestore query results for permission-denied errors
- Verify member-user linking resolves correctly for savings data
- Check real-time listener initialization and error handling
- **Updated**: Monitor capital share data fetching for proper transaction and member data resolution

### Component Rendering Problems
- Confirm authentication context availability in components
- Validate Firestore connection status and configuration
- Review error boundaries and fallback UI states
- **Updated**: Verify capital share display logic for proper conditional rendering based on payment status

**Section sources**
- [lib/auth.tsx:197-348](file://lib/auth.tsx#L197-L348)
- [lib/firebase.ts:62-87](file://lib/firebase.ts#L62-L87)
- [components/user/ActiveSavings.tsx:42-50](file://components/user/ActiveSavings.tsx#L42-L50)
- [hooks/useCapitalShare.ts:122-127](file://hooks/useCapitalShare.ts#L122-L127)

## Conclusion
The Member Dashboard provides a robust, real-time financial interface tailored to cooperative members with refined capital share display capabilities. Through role-based access control, dynamic content adaptation, and seamless Firestore integration, it delivers personalized financial insights with responsive design and comprehensive error handling. The enhanced capital share management system now clearly communicates payment status through conditional formatting, showing remaining balance for incomplete payments and total paid amount for fully paid members. The modular architecture supports easy customization and extension for additional financial summaries and member services while maintaining strong data privacy and security practices.