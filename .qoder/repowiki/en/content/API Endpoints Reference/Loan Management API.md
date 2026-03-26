# Loan Management API

<cite>
**Referenced Files in This Document**
- [app/api/loans/route.ts](file://app/api/loans/route.ts)
- [components/user/actions/LoanActions.tsx](file://components/user/actions/LoanActions.tsx)
- [components/admin/LoanDetailsModal.tsx](file://components/admin/LoanDetailsModal.tsx)
- [components/admin/LoanRequestsManager.tsx](file://components/admin/LoanRequestsManager.tsx)
- [components/admin/LoanTable.tsx](file://components/admin/LoanTable.tsx)
- [components/user/LoanRecords.tsx](file://components/user/LoanRecords.tsx)
- [components/user/ActiveLoans.tsx](file://components/user/ActiveLoans.tsx)
- [lib/types/loan.ts](file://lib/types/loan.ts)
- [lib/savingsService.ts](file://lib/savingsService.ts)
- [scripts/fix-loan-calculations.js](file://scripts/fix-loan-calculations.js)
</cite>

## Update Summary
**Changes Made**
- Updated interest calculation algorithms section to reflect the corrected formula: Principal × Interest Rate × Term (in months)
- Added documentation for the loan calculation fix script that addresses mathematical errors
- Enhanced payment schedule calculation documentation with proper interest distribution
- Updated amortization schedule examples to show correct mathematical approach
- Added information about the automated script that fixes existing loan calculations

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
This document provides comprehensive API documentation for the loan management system, covering the complete loan lifecycle from application to repayment. The system has been enhanced with improved calculation algorithms for loan amortization schedules, fixing mathematical errors in payment schedule calculations. The system now properly calculates total interest using the formula: Principal × Interest Rate × Term (in months) rather than the previous flat interest approach.

## Project Structure
The loan management functionality spans API routes, frontend components, and shared types/services:
- API routes define backend endpoints for loan operations.
- Frontend components implement user workflows for applying, reviewing, and managing loans.
- Shared types define loan-related data structures.
- Services integrate with Firebase and member/savings systems.
- A dedicated script handles the correction of existing loan calculations.

```mermaid
graph TB
subgraph "API Layer"
LoansRoute["app/api/loans/route.ts"]
end
subgraph "Frontend Components"
UserLoanActions["components/user/actions/LoanActions.tsx"]
AdminLoanDetails["components/admin/LoanDetailsModal.tsx"]
AdminLoanRequests["components/admin/LoanRequestsManager.tsx"]
AdminLoanTable["components/admin/LoanTable.tsx"]
ActiveLoans["components/user/ActiveLoans.tsx"]
LoanRecords["components/user/LoanRecords.tsx"]
end
subgraph "Shared Types"
LoanTypes["lib/types/loan.ts"]
end
subgraph "Services"
SavingsService["lib/savingsService.ts"]
end
subgraph "Maintenance Scripts"
FixScript["scripts/fix-loan-calculations.js"]
end
UserLoanActions --> LoansRoute
AdminLoanRequests --> LoansRoute
AdminLoanDetails --> LoansRoute
AdminLoanTable --> LoansRoute
ActiveLoans --> LoansRoute
LoanRecords --> LoansRoute
AdminLoanDetails --> SavingsService
UserLoanActions --> LoanTypes
AdminLoanRequests --> LoanTypes
FixScript --> LoansRoute
```

**Diagram sources**
- [app/api/loans/route.ts:1-133](file://app/api/loans/route.ts#L1-L133)
- [components/user/actions/LoanActions.tsx:1-663](file://components/user/actions/LoanActions.tsx#L1-L663)
- [components/admin/LoanDetailsModal.tsx:1-1036](file://components/admin/LoanDetailsModal.tsx#L1-L1036)
- [components/admin/LoanRequestsManager.tsx:1-1069](file://components/admin/LoanRequestsManager.tsx#L1-L1069)
- [components/admin/LoanTable.tsx:113-194](file://components/admin/LoanTable.tsx#L113-L194)
- [components/user/ActiveLoans.tsx:145-344](file://components/user/ActiveLoans.tsx#L145-L344)
- [components/user/LoanRecords.tsx:91-290](file://components/user/LoanRecords.tsx#L91-L290)
- [lib/types/loan.ts:1-20](file://lib/types/loan.ts#L1-L20)
- [lib/savingsService.ts:1-455](file://lib/savingsService.ts#L1-L455)
- [scripts/fix-loan-calculations.js:1-140](file://scripts/fix-loan-calculations.js#L1-L140)

**Section sources**
- [app/api/loans/route.ts:1-133](file://app/api/loans/route.ts#L1-L133)
- [components/user/actions/LoanActions.tsx:1-663](file://components/user/actions/LoanActions.tsx#L1-L663)
- [components/admin/LoanDetailsModal.tsx:1-1036](file://components/admin/LoanDetailsModal.tsx#L1-L1036)
- [components/admin/LoanRequestsManager.tsx:1-1069](file://components/admin/LoanRequestsManager.tsx#L1-L1069)
- [components/admin/LoanTable.tsx:113-194](file://components/admin/LoanTable.tsx#L113-L194)
- [components/user/ActiveLoans.tsx:145-344](file://components/user/ActiveLoans.tsx#L145-L344)
- [components/user/LoanRecords.tsx:91-290](file://components/user/LoanRecords.tsx#L91-L290)
- [lib/types/loan.ts:1-20](file://lib/types/loan.ts#L1-L20)
- [lib/savingsService.ts:1-455](file://lib/savingsService.ts#L1-L455)
- [scripts/fix-loan-calculations.js:1-140](file://scripts/fix-loan-calculations.js#L1-L140)

## Core Components
- Loan API Route: Provides GET and POST endpoints for retrieving and creating loans, with basic validation and response formatting.
- Loan Application Workflow: Handles user application submission, plan selection, amortization preview, and persistence to loan requests.
- Loan Approval Workflow: Manages approval/rejection of loan requests and creation of active loans with payment schedules.
- Payment Processing: Enables payment confirmations, partial/full payment allocation, receipt generation, and status updates.
- Loan Tracking: Displays amortization schedules, remaining balances, and payment history.
- Calculation Maintenance: Automated script to fix mathematical errors in existing loan calculations.

**Section sources**
- [app/api/loans/route.ts:4-133](file://app/api/loans/route.ts#L4-L133)
- [components/user/actions/LoanActions.tsx:75-222](file://components/user/actions/LoanActions.tsx#L75-L222)
- [components/admin/LoanRequestsManager.tsx:349-390](file://components/admin/LoanRequestsManager.tsx#L349-L390)
- [components/admin/LoanDetailsModal.tsx:298-374](file://components/admin/LoanDetailsModal.tsx#L298-L374)
- [components/admin/LoanTable.tsx:146-179](file://components/admin/LoanTable.tsx#L146-L179)
- [scripts/fix-loan-calculations.js:1-140](file://scripts/fix-loan-calculations.js#L1-L140)

## Architecture Overview
The loan lifecycle integrates frontend components with API routes and Firestore collections. Users apply for loans via LoanActions, which submits loan requests. Administrators review and approve requests, creating active loans with payment schedules. Payments are processed through LoanDetailsModal, updating loan documents and notifying users. An automated script ensures mathematical accuracy across existing loan records.

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "LoanActions"
participant API as "Loans API"
participant AdminUI as "LoanRequestsManager"
participant LoanDoc as "Firestore Loans"
participant MemberDoc as "Firestore Members"
participant FixScript as "Fix Script"
User->>UI : Select plan and submit application
UI->>API : POST /api/loans (application payload)
API-->>UI : {success, data : loanRequestId}
AdminUI->>LoanDoc : Create loan document (approved)
LoanDoc-->>AdminUI : {success, loanId}
AdminUI->>MemberDoc : Link member info (optional)
MemberDoc-->>AdminUI : {success}
FixScript->>LoanDoc : Update loan calculations (if needed)
User->>LoanDoc : View active loan and schedule
```

**Diagram sources**
- [components/user/actions/LoanActions.tsx:174-222](file://components/user/actions/LoanActions.tsx#L174-L222)
- [app/api/loans/route.ts:42-112](file://app/api/loans/route.ts#L42-L112)
- [components/admin/LoanRequestsManager.tsx:349-390](file://components/admin/LoanRequestsManager.tsx#L349-L390)
- [components/admin/LoanTable.tsx:146-179](file://components/admin/LoanTable.tsx#L146-L179)
- [scripts/fix-loan-calculations.js:20-140](file://scripts/fix-loan-calculations.js#L20-L140)

## Detailed Component Analysis

### Loan API Endpoints
- GET /api/loans
  - Purpose: Retrieve all loans.
  - Response: success flag, array of loan objects, and count.
  - Notes: Basic collection retrieval with error handling.
- POST /api/loans
  - Purpose: Create a new loan application.
  - Request body fields:
    - memberId (required)
    - amount (required)
    - interestRate (required)
    - term (required)
    - startDate (required)
  - Validation:
    - Required fields present.
    - Numeric fields parse correctly.
  - Behavior:
    - Creates a loan document with status "pending".
    - Generates a unique loan ID.
    - Returns success with created loan data.

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "Loans API"
participant FS as "Firestore"
Client->>API : POST /api/loans {memberId, amount, interestRate, term, startDate}
API->>API : Validate required fields and types
API->>FS : setDocument("loans", loanId, loanData)
FS-->>API : {success}
API-->>Client : {success : true, data : {id, ...loanData}}
```

**Diagram sources**
- [app/api/loans/route.ts:42-112](file://app/api/loans/route.ts#L42-L112)

**Section sources**
- [app/api/loans/route.ts:4-133](file://app/api/loans/route.ts#L4-L133)

### Loan Application Workflow
- Plan Selection and Validation:
  - Users choose a loan plan and specify amount and term.
  - Client-side validation ensures amount does not exceed plan max and term is valid.
- Amortization Preview:
  - Daily payment and interest calculations are computed using the corrected formula: Principal × Interest Rate × Term (in months).
  - Amortization schedule is paginated for review.
- Submission:
  - Application payload includes user info, plan details, and calculated schedule.
  - Saved to loan requests collection with status "pending".

```mermaid
flowchart TD
Start(["User selects plan"]) --> Input["Enter amount and term"]
Input --> Validate["Validate amount <= max and term valid"]
Validate --> |Valid| Calc["Compute daily payment and schedule<br/>using Principal × Interest Rate × Term"]
Calc --> Review["Show amortization preview"]
Review --> Confirm["Confirm application"]
Confirm --> Submit["POST loan request to backend"]
Submit --> End(["Submitted with status 'pending'"])
Validate --> |Invalid| Error["Show validation error"]
Error --> Input
```

**Diagram sources**
- [components/user/actions/LoanActions.tsx:67-134](file://components/user/actions/LoanActions.tsx#L67-L134)

**Section sources**
- [components/user/actions/LoanActions.tsx:67-134](file://components/user/actions/LoanActions.tsx#L67-L134)
- [lib/types/loan.ts:1-20](file://lib/types/loan.ts#L1-L20)

### Loan Approval Workflow
- Approval:
  - Admin retrieves loan requests and approves selected requests.
  - On approval, a new loan document is created in the "loans" collection with status "active".
  - Payment schedule is generated using the corrected calculation algorithm with proper interest distribution.
- Rejection:
  - Admin can reject requests with a reason; status updated accordingly.

```mermaid
sequenceDiagram
participant Admin as "Admin"
participant Requests as "LoanRequests"
participant Loans as "Loans Collection"
participant Member as "Members Collection"
Admin->>Requests : Fetch pending requests
Admin->>Requests : Approve request (requestId)
Admin->>Member : Lookup member info (optional)
Member-->>Admin : Member details
Admin->>Loans : Create loan document (status=active, paymentSchedule)
Loans-->>Admin : Success
Admin->>Requests : Update request status to approved
```

**Diagram sources**
- [components/admin/LoanRequestsManager.tsx:349-390](file://components/admin/LoanRequestsManager.tsx#L349-L390)
- [components/admin/LoanTable.tsx:146-179](file://components/admin/LoanTable.tsx#L146-L179)

**Section sources**
- [components/admin/LoanRequestsManager.tsx:349-390](file://components/admin/LoanRequestsManager.tsx#L349-L390)
- [components/admin/LoanTable.tsx:146-179](file://components/admin/LoanTable.tsx#L146-L179)

### Payment Processing Endpoints and Logic
- Payment Initiation:
  - Admin opens loan details modal and initiates payment.
  - User enters payment amount; remaining balance is shown.
- Payment Allocation:
  - System allocates payments to installments in order until the amount is exhausted.
  - Supports full and partial payments; marks installments accordingly.
- Receipt Generation:
  - Unique receipt number is generated for each payment session.
- Status Updates:
  - Updated payment schedule and remaining balance are persisted.
  - If all installments are paid, loan status is updated to "completed".
- Notifications:
  - Payment notifications are created for users with details.

```mermaid
flowchart TD
PStart(["Initiate Payment"]) --> Enter["Enter payment amount"]
Enter --> ValidateP["Validate amount > 0"]
ValidateP --> |Invalid| PError["Show error"]
ValidateP --> |Valid| Allocate["Allocate to installments in order"]
Allocate --> Full{"Full payment?"}
Full --> |Yes| MarkFull["Mark installment(s) as 'paid'"]
Full --> |No| MarkPartial["Mark as 'partial'"]
MarkFull --> Update["Update loan document (schedule, balance)"]
MarkPartial --> Update
Update --> Notify["Create payment notification"]
Notify --> Done(["Success"])
PError --> Enter
```

**Diagram sources**
- [components/admin/LoanDetailsModal.tsx:298-374](file://components/admin/LoanDetailsModal.tsx#L298-L374)

**Section sources**
- [components/admin/LoanDetailsModal.tsx:298-374](file://components/admin/LoanDetailsModal.tsx#L298-L374)

### Loan Tracking Endpoints and Schemas
- Loan Listing:
  - GET /api/loans returns all loans with success flag, data array, and count.
- Loan Details:
  - Admin and user views show loan details, amortization schedule, remaining balance, and payment history.
- Request Schema (LoanRequest):
  - Fields: userId, planId, planName, amount, term, status, createdAt.
- Loan Object Schema (from frontend usage):
  - Fields: id, userId, fullName, role, amount, term, startDate, interest, status, remainingBalance?, paymentSchedule?.
- Payment Schedule Item:
  - Fields: day, paymentDate, principal, interest, totalPayment, remainingBalance, status, receiptNumber?, paymentDateProcessed?.

```mermaid
erDiagram
LOAN_REQUEST {
string userId
string planId
string planName
number amount
number term
enum status
string createdAt
}
LOAN {
string id
string userId
string fullName
string role
number amount
number term
string startDate
number interest
string status
number remainingBalance
}
AMORTIZATION_SCHEDULE {
number day
string paymentDate
number principal
number interest
number totalPayment
number remainingBalance
string status
string receiptNumber
string paymentDateProcessed
}
LOAN ||--o{ AMORTIZATION_SCHEDULE : "has"
```

**Diagram sources**
- [lib/types/loan.ts:12-20](file://lib/types/loan.ts#L12-L20)
- [components/admin/LoanDetailsModal.tsx:9-33](file://components/admin/LoanDetailsModal.tsx#L9-L33)

**Section sources**
- [app/api/loans/route.ts:4-39](file://app/api/loans/route.ts#L4-L39)
- [lib/types/loan.ts:1-20](file://lib/types/loan.ts#L1-L20)
- [components/admin/LoanDetailsModal.tsx:9-33](file://components/admin/LoanDetailsModal.tsx#L9-L33)

### Validation Rules and Risk Assessment Criteria
- Loan Application Validation:
  - Amount must be greater than zero and not exceed plan maximum.
  - Term must be a positive integer included in plan options.
  - Selected plan must be valid.
- Payment Validation:
  - Payment amount must be greater than zero.
  - Remaining balance is considered for allocation.
- Risk Assessment:
  - Current implementation relies on plan-defined maxAmount and termOptions.
  - Member linking and savings balances can inform risk decisions (see Integrations).

**Section sources**
- [components/user/actions/LoanActions.tsx:120-128](file://components/user/actions/LoanActions.tsx#L120-L128)
- [components/admin/LoanDetailsModal.tsx:282-295](file://components/admin/LoanDetailsModal.tsx#L282-L295)

### Interest Calculation Algorithms
**Updated** The loan system now uses the corrected interest calculation formula: **Principal × Interest Rate × Term (in months)**

- Daily Interest Rate Distribution:
  - Total interest calculated using: Principal × (Interest Rate / 100) × Term (in months)
  - Daily interest portion = Total Interest / Total Days
  - Daily principal portion = Principal / Total Days
- Daily Payment Calculation:
  - Daily payment = Principal Per Day + Interest Per Day
  - Remaining balance decreases by daily payment each day
- Amortization Schedule Generation:
  - Each day's interest equals total interest divided by total days
  - Principal equals daily payment minus interest
  - Remaining balance decremented by daily payment; capped at zero

```mermaid
flowchart TD
S(["Start"]) --> TI["Calculate Total Interest = Principal × (Interest Rate/100) × Term"]
TI --> DA["Calculate Daily Amounts:<br/>Daily Principal = Principal/TotalDays<br/>Daily Interest = TotalInterest/TotalDays<br/>Daily Payment = DailyPrincipal + DailyInterest"]
DA --> Loop{"For each day"}
Loop --> IP["Interest = TotalInterest/TotalDays"]
IP --> PP["Principal = DailyPayment - Interest"]
PP --> RB["remainingBalance -= DailyPayment; cap at 0"]
RB --> Next["Next day"]
Next --> Loop
Loop --> |Done| E(["End"])
```

**Diagram sources**
- [components/admin/LoanDetailsModal.tsx:103-156](file://components/admin/LoanDetailsModal.tsx#L103-L156)
- [components/user/actions/LoanActions.tsx:67-106](file://components/user/actions/LoanActions.tsx#L67-L106)
- [components/user/LoanRecords.tsx:91-142](file://components/user/LoanRecords.tsx#L91-L142)
- [components/user/ActiveLoans.tsx:145-204](file://components/user/ActiveLoans.tsx#L145-L204)

**Section sources**
- [components/admin/LoanDetailsModal.tsx:103-156](file://components/admin/LoanDetailsModal.tsx#L103-L156)
- [components/user/actions/LoanActions.tsx:67-106](file://components/user/actions/LoanActions.tsx#L67-L106)
- [components/user/LoanRecords.tsx:91-142](file://components/user/LoanRecords.tsx#L91-L142)
- [components/user/ActiveLoans.tsx:145-204](file://components/user/ActiveLoans.tsx#L145-L204)

### Integrations with Savings and Member Systems
- Member Resolution:
  - Services link user IDs to member documents via userId, email, or decoded email fallback.
- Savings Integration:
  - Savings service provides member ID resolution and atomic savings transactions.
  - Can be leveraged to assess member financial health for risk evaluation.
- Notification System:
  - Payment notifications are created with details for user communication.

```mermaid
sequenceDiagram
participant User as "User"
participant Savings as "SavingsService"
participant Members as "Firestore Members"
User->>Savings : getMemberIdByUserId(userId)
Savings->>Members : Query by userId/email/name
Members-->>Savings : Member ID
Savings-->>User : Member ID resolved
```

**Diagram sources**
- [lib/savingsService.ts:21-135](file://lib/savingsService.ts#L21-L135)

**Section sources**
- [lib/savingsService.ts:21-135](file://lib/savingsService.ts#L21-L135)
- [components/admin/LoanDetailsModal.tsx:377-411](file://components/admin/LoanDetailsModal.tsx#L377-L411)

### Loan Calculation Maintenance and Correction
**New Section** The system includes an automated maintenance script to fix mathematical errors in existing loan calculations.

- Script Purpose:
  - Fixes loans calculated with the incorrect formula: interest = amount × (rate / 100) (without multiplying by term)
  - Corrects to: interest = amount × (rate / 100) × term
- Detection Logic:
  - Identifies loans with missing required fields
  - Compares stored remaining balance against expected values from correct formula
  - Applies corrections with configurable tolerance
- Correction Process:
  - Recalculates total interest, total amount, and daily payments
  - Updates payment schedules with corrected values
  - Preserves payment history while fixing mathematical errors
  - Marks corrected loans with metadata for tracking

```mermaid
flowchart TD
Start(["Run Fix Script"]) --> Scan["Scan all loans collection"]
Scan --> Validate["Validate required fields"]
Validate --> |Missing| Skip["Skip loan"]
Validate --> |Present| Calc["Calculate correct values:<br/>Total Interest = Principal × Rate × Term<br/>Daily Principal = Principal/TermDays<br/>Daily Interest = TotalInterest/TermDays"]
Calc --> Compare["Compare with stored values"]
Compare --> |Match Old Formula| Update["Update loan with corrected values"]
Compare --> |No Match| Skip
Update --> Log["Log correction and metadata"]
Skip --> Next["Next loan"]
Log --> Next
Next --> End(["Complete"])
```

**Diagram sources**
- [scripts/fix-loan-calculations.js:20-140](file://scripts/fix-loan-calculations.js#L20-L140)

**Section sources**
- [scripts/fix-loan-calculations.js:1-140](file://scripts/fix-loan-calculations.js#L1-L140)

## Dependency Analysis
- API route depends on Firebase Admin for Firestore operations.
- Frontend components depend on shared types and services for data modeling and member resolution.
- Admin components coordinate between loan requests and active loans collections.
- Payment processing depends on amortization schedule structure and status fields.
- Maintenance script depends on Firebase Admin SDK for database operations.

```mermaid
graph TB
LoansAPI["app/api/loans/route.ts"] --> Types["lib/types/loan.ts"]
LoansAPI --> Firebase["Firebase Admin"]
UserActions["components/user/actions/LoanActions.tsx"] --> Types
AdminDetails["components/admin/LoanDetailsModal.tsx"] --> Firebase
AdminRequests["components/admin/LoanRequestsManager.tsx"] --> Firebase
AdminTable["components/admin/LoanTable.tsx"] --> Firebase
ActiveLoans["components/user/ActiveLoans.tsx"] --> Firebase
LoanRecords["components/user/LoanRecords.tsx"] --> Firebase
SavingsSvc["lib/savingsService.ts"] --> Firebase
FixScript["scripts/fix-loan-calculations.js"] --> Firebase
```

**Diagram sources**
- [app/api/loans/route.ts:1-2](file://app/api/loans/route.ts#L1-L2)
- [lib/types/loan.ts:1-20](file://lib/types/loan.ts#L1-L20)
- [components/user/actions/LoanActions.tsx:1-12](file://components/user/actions/LoanActions.tsx#L1-L12)
- [components/admin/LoanDetailsModal.tsx:1-8](file://components/admin/LoanDetailsModal.tsx#L1-L8)
- [components/admin/LoanRequestsManager.tsx:1-5](file://components/admin/LoanRequestsManager.tsx#L1-L5)
- [components/admin/LoanTable.tsx:1-5](file://components/admin/LoanTable.tsx#L1-L5)
- [components/user/ActiveLoans.tsx:1-5](file://components/user/ActiveLoans.tsx#L1-L5)
- [components/user/LoanRecords.tsx:1-5](file://components/user/LoanRecords.tsx#L1-L5)
- [lib/savingsService.ts:1-3](file://lib/savingsService.ts#L1-L3)
- [scripts/fix-loan-calculations.js:9-18](file://scripts/fix-loan-calculations.js#L9-L18)

**Section sources**
- [app/api/loans/route.ts:1-133](file://app/api/loans/route.ts#L1-L133)
- [lib/types/loan.ts:1-20](file://lib/types/loan.ts#L1-L20)
- [components/user/actions/LoanActions.tsx:1-12](file://components/user/actions/LoanActions.tsx#L1-L12)
- [components/admin/LoanDetailsModal.tsx:1-8](file://components/admin/LoanDetailsModal.tsx#L1-L8)
- [components/admin/LoanRequestsManager.tsx:1-5](file://components/admin/LoanRequestsManager.tsx#L1-L5)
- [components/admin/LoanTable.tsx:1-5](file://components/admin/LoanTable.tsx#L1-L5)
- [components/user/ActiveLoans.tsx:1-5](file://components/user/ActiveLoans.tsx#L1-L5)
- [components/user/LoanRecords.tsx:1-5](file://components/user/LoanRecords.tsx#L1-L5)
- [lib/savingsService.ts:1-3](file://lib/savingsService.ts#L1-L3)
- [scripts/fix-loan-calculations.js:1-140](file://scripts/fix-loan-calculations.js#L1-L140)

## Performance Considerations
- Amortization computation is client-side for preview; for large terms, consider server-side generation to reduce client load.
- Pagination in amortization schedules helps manage rendering performance.
- Firestore queries should be indexed appropriately for loan requests and loans collections to optimize listing and filtering.
- The maintenance script processes loans in batches to avoid database timeouts during bulk operations.

## Troubleshooting Guide
- API Errors:
  - Validation failures return structured errors with 400 status.
  - Internal errors return 500 with generic messages; inspect server logs for details.
- Payment Issues:
  - Ensure payment amount is valid and greater than zero.
  - Verify remaining balance reflects unpaid installments.
- Member/Missing Data:
  - If member info is missing, fallback to user data; confirm user/member linkage.
- Calculation Errors:
  - Use the maintenance script to fix mathematical errors in existing loans.
  - Verify interest calculations use the correct formula: Principal × Interest Rate × Term (in months).

**Section sources**
- [app/api/loans/route.ts:47-67](file://app/api/loans/route.ts#L47-L67)
- [components/admin/LoanDetailsModal.tsx:282-295](file://components/admin/LoanDetailsModal.tsx#L282-L295)
- [scripts/fix-loan-calculations.js:74-78](file://scripts/fix-loan-calculations.js#L74-L78)

## Conclusion
The loan management system provides a clear lifecycle from application to repayment, with robust frontend workflows and backend API support. The system has been enhanced with improved calculation algorithms that properly calculate total interest using the formula: Principal × Interest Rate × Term (in months). An automated maintenance script ensures mathematical accuracy across existing loan records. While the current API exposes minimal filtering and pagination, the frontend components demonstrate comprehensive tracking and payment capabilities. Extending the API with filtering, pagination, and explicit status transitions would further enhance operational efficiency and auditability.