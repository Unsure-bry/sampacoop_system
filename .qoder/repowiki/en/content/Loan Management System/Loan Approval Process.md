# Loan Approval Process

<cite>
**Referenced Files in This Document**
- [LoanRequestsManager.tsx](file://components/admin/LoanRequestsManager.tsx)
- [LoanRequestsManagerRefactored.tsx](file://components/admin/LoanRequestsManagerRefactored.tsx)
- [LoanRequestsTable.tsx](file://components/admin/LoanRequestsTable.tsx)
- [LoanRequestsPage.tsx](file://app/admin/loans/requests/page.tsx)
- [LoanRequestDetailsModal.tsx](file://components/admin/LoanRequestDetailsModal.tsx)
- [LoanContractModal.tsx](file://components/admin/LoanContractModal.tsx)
- [Pagination.tsx](file://components/admin/Pagination.tsx)
- [useFirestoreData.ts](file://hooks/useFirestoreData.ts)
- [firebase.ts](file://lib/firebase.ts)
- [FIRESTORE_INDEXES.md](file://docs/FIRESTORE_INDEXES.md)
- [route.ts](file://app/api/loans/route.ts)
- [apiUtils.ts](file://lib/apiUtils.ts)
</cite>

## Update Summary
**Changes Made**
- Enhanced loan approval process with integrated certificate generation workflow
- Added LoanContractModal component for automated contract creation and PDF generation
- Integrated automatic contract modal opening after loan approval
- Updated approval workflow to include contract generation step
- Added LoanContractModal state management to LoanRequestsManager

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
This document explains the enhanced loan approval process workflow in the cooperative management system. The system now features an integrated certificate generation workflow that automatically opens the LoanContractModal after loan approval, allowing administrators to create contracts immediately with proper loan data integration. The workflow covers the role-based approval mechanism, the LoanRequestsManager component's capabilities (listing, approvals/rejections, status tracking), the approval workflow logic (automated checks, manual review, notifications), and the LoanRequestsTable implementation (sorting, filtering, pagination, and bulk actions). It also documents the refactored version improvements and migration considerations, along with approval criteria, required documentation review, risk assessment factors, compliance requirements, and examples of approval scenarios, rejection reasons, and escalation procedures for high-value loans.

## Project Structure
The loan approval UI is organized under the admin section and integrates with shared components and hooks for data fetching and presentation. The enhanced system now includes the LoanContractModal for automated certificate generation.

```mermaid
graph TB
subgraph "Admin UI"
A["LoanRequestsPage<br/>(app/admin/loans/requests/page.tsx)"]
B["LoanRequestsTable<br/>(components/admin/LoanRequestsTable.tsx)"]
C["LoanRequestsManager<br/>(components/admin/LoanRequestsManager.tsx)"]
D["LoanRequestDetailsModal<br/>(components/admin/LoanRequestDetailsModal.tsx)"]
E["LoanContractModal<br/>(components/admin/LoanContractModal.tsx)"]
F["Pagination<br/>(components/admin/Pagination.tsx)"]
end
subgraph "Hooks & Services"
G["useFirestoreData<br/>(hooks/useFirestoreData.ts)"]
H["Firebase Client Utils<br/>(lib/firebase.ts)"]
end
subgraph "Backend APIs"
I["Loans API Route<br/>(app/api/loans/route.ts)"]
J["API Utilities<br/>(lib/apiUtils.ts)"]
end
A --> B --> C
C --> D
C --> E
C --> F
C --> G
G --> H
I --> J
```

**Diagram sources**
- [LoanRequestsPage.tsx:1-16](file://app/admin/loans/requests/page.tsx#L1-L16)
- [LoanRequestsTable.tsx:1-10](file://components/admin/LoanRequestsTable.tsx#L1-L10)
- [LoanRequestsManager.tsx:1-1069](file://components/admin/LoanRequestsManager.tsx#L1-L1069)
- [LoanRequestDetailsModal.tsx:1-392](file://components/admin/LoanRequestDetailsModal.tsx#L1-L392)
- [LoanContractModal.tsx:1-404](file://components/admin/LoanContractModal.tsx#L1-L404)
- [Pagination.tsx:1-141](file://components/admin/Pagination.tsx#L1-L141)
- [useFirestoreData.ts:1-182](file://hooks/useFirestoreData.ts#L1-L182)
- [firebase.ts:1-309](file://lib/firebase.ts#L1-L309)
- [route.ts:1-133](file://app/api/loans/route.ts#L1-L133)
- [apiUtils.ts:1-109](file://lib/apiUtils.ts#L1-L109)

**Section sources**
- [LoanRequestsPage.tsx:1-16](file://app/admin/loans/requests/page.tsx#L1-L16)
- [LoanRequestsTable.tsx:1-10](file://components/admin/LoanRequestsTable.tsx#L1-L10)
- [LoanRequestsManager.tsx:1-1069](file://components/admin/LoanRequestsManager.tsx#L1-L1069)
- [LoanRequestDetailsModal.tsx:1-392](file://components/admin/LoanRequestDetailsModal.tsx#L1-L392)
- [LoanContractModal.tsx:1-404](file://components/admin/LoanContractModal.tsx#L1-L404)
- [Pagination.tsx:1-141](file://components/admin/Pagination.tsx#L1-L141)
- [useFirestoreData.ts:1-182](file://hooks/useFirestoreData.ts#L1-L182)
- [firebase.ts:1-309](file://lib/firebase.ts#L1-L309)
- [route.ts:1-133](file://app/api/loans/route.ts#L1-L133)
- [apiUtils.ts:1-109](file://lib/apiUtils.ts#L1-L109)

## Core Components
- LoanRequestsManager: Central component for managing loan requests with tabs for pending, approved, and rejected requests; supports real-time updates, search, pagination, approval/rejection actions, and integrated contract generation workflow.
- LoanRequestDetailsModal: Detailed modal for viewing request metadata and performing approval/rejection actions.
- LoanContractModal: New component for automated contract creation, PDF generation, and loan approval workflow integration.
- Pagination: Generic pagination component with ellipsis navigation.
- useFirestoreData: Hook that provides real-time data with client-side sorting and error handling, avoiding composite index requirements.
- Firebase Client Utils: Wrapper around Firestore client SDK with standardized helpers for CRUD operations.
- Loans API Route: Backend route for listing and creating loans with validation and standardized responses.

Key responsibilities:
- Role-based approval: The manager triggers approval/rejection actions; the UI enforces required rejection reasons for rejections.
- Status tracking: Requests are categorized by status and sorted by timestamps (createdAt, approvedAt, rejectedAt).
- Notification: Toast notifications provide user feedback for success/error states.
- Integrated contract workflow: Automatic contract modal opening and loan approval after contract generation.
- Refactoring: A refactored version demonstrates improved maintainability using the hook-based approach.

**Section sources**
- [LoanRequestsManager.tsx:64-1069](file://components/admin/LoanRequestsManager.tsx#L64-L1069)
- [LoanRequestDetailsModal.tsx:42-392](file://components/admin/LoanRequestDetailsModal.tsx#L42-L392)
- [LoanContractModal.tsx:11-404](file://components/admin/LoanContractModal.tsx#L11-L404)
- [Pagination.tsx:11-141](file://components/admin/Pagination.tsx#L11-L141)
- [useFirestoreData.ts:19-182](file://hooks/useFirestoreData.ts#L19-L182)
- [firebase.ts:90-309](file://lib/firebase.ts#L90-L309)
- [route.ts:1-133](file://app/api/loans/route.ts#L1-L133)

## Architecture Overview
The enhanced loan approval workflow spans UI components, a hook-based data layer, and backend APIs. The system uses Firestore for persistence and real-time updates, with optional composite indexes for performance. The new workflow integrates contract generation seamlessly into the approval process.

```mermaid
sequenceDiagram
participant U as "User/Admin"
participant P as "LoanRequestsPage"
participant T as "LoanRequestsTable"
participant M as "LoanRequestsManager"
participant H as "useFirestoreData"
participant F as "Firebase Client Utils"
participant R as "Loans API Route"
U->>P : Open Loan Requests page
P->>T : Render table wrapper
T->>M : Initialize manager
M->>H : Subscribe to loanRequests (pending/approved/rejected)
H->>F : onSnapshot(query with filters)
F-->>H : Real-time updates
H-->>M : Sorted data arrays
U->>M : Click Approve
M->>M : Show Approval Confirmation Modal
U->>M : Click Proceed
M->>M : Open LoanContractModal
M->>M : Generate Contract PDF
M->>F : Update loanRequests status to approved
M->>F : Create loan document in "loans" collection
F-->>M : Success/Error
M-->>U : Toast notification
U->>R : Optional : Call backend API to list loans
R-->>U : JSON response with loan data
```

**Diagram sources**
- [LoanRequestsPage.tsx:1-16](file://app/admin/loans/requests/page.tsx#L1-L16)
- [LoanRequestsTable.tsx:1-10](file://components/admin/LoanRequestsTable.tsx#L1-L10)
- [LoanRequestsManager.tsx:143-255](file://components/admin/LoanRequestsManager.tsx#L143-L255)
- [useFirestoreData.ts:65-125](file://hooks/useFirestoreData.ts#L65-L125)
- [firebase.ts:184-240](file://lib/firebase.ts#L184-L240)
- [route.ts:1-133](file://app/api/loans/route.ts#L1-L133)

## Detailed Component Analysis

### LoanRequestsManager
Responsibilities:
- Real-time listeners for pending/approved/rejected loan requests using Firestore snapshots.
- Client-side sorting by appropriate timestamps.
- Approval flow: updates status to approved, computes a daily amortization schedule, and creates a loan record.
- Rejection flow: updates status to rejected with a required reason.
- Search/filtering across user name, email, plan name, request ID, and role.
- Pagination per tab with configurable items per page.
- Modal-driven details view for each request.
- **Enhanced**: Integrated contract modal state management and automatic contract generation workflow.

Approval workflow logic:
- On approve: set status to approved, capture approvedAt and approvedBy placeholders, fetch plan interest rate, compute daily schedule, and persist a new loan document.
- On reject: require a non-empty rejection reason, set status to rejected with rejectedAt and rejectedBy placeholders.
- **Enhanced**: Approval confirmation modal now opens LoanContractModal for contract generation, which automatically approves the loan after successful PDF generation.

```mermaid
flowchart TD
Start(["User clicks Approve"]) --> Confirm["Show Approval Confirmation Modal"]
Confirm --> Proceed{"User clicks Proceed?"}
Proceed --> |No| Cancel["Close modal and cancel approval"]
Proceed --> |Yes| OpenContract["Open LoanContractModal"]
OpenContract --> GeneratePDF["Generate Contract PDF"]
GeneratePDF --> Success{"PDF Generated Successfully?"}
Success --> |No| ErrorToast["Show error toast"]
Success --> |Yes| AutoApprove["Automatically approve loan"]
AutoApprove --> UpdateStatus["Update loanRequests status to approved<br/>Add approvedAt and approvedBy"]
UpdateStatus --> FetchPlan["Fetch loan plan to get interest rate"]
FetchPlan --> ComputeSchedule["Compute daily amortization schedule"]
ComputeSchedule --> CreateLoan["Create loan document in 'loans' collection"]
CreateLoan --> Notify["Show success toast"]
Notify --> End(["Done"])
Start2(["User clicks Reject"]) --> ValidateReason{"Rejection reason provided?"}
ValidateReason --> |No| ErrorToast2["Show error toast"]
ValidateReason --> |Yes| UpdateReject["Update status to rejected<br/>Set rejectionReason, rejectedAt, rejectedBy"]
UpdateReject --> Notify2["Show success toast"]
Notify2 --> End2(["Done"])
```

**Diagram sources**
- [LoanRequestsManager.tsx:257-476](file://components/admin/LoanRequestsManager.tsx#L257-L476)
- [LoanRequestsManager.tsx:954-962](file://components/admin/LoanRequestsManager.tsx#L954-L962)
- [LoanRequestsManager.tsx:1052-1065](file://components/admin/LoanRequestsManager.tsx#L1052-L1065)

**Section sources**
- [LoanRequestsManager.tsx:64-1069](file://components/admin/LoanRequestsManager.tsx#L64-L1069)

### LoanRequestDetailsModal
Responsibilities:
- Displays detailed information for a selected loan request.
- Provides action buttons for pending requests (approve/reject) with a required rejection reason input.
- Shows status badges and timestamps for approved/rejected requests.
- **Enhanced**: Contract preview functionality for approved requests with positioning tool integration.

**Section sources**
- [LoanRequestDetailsModal.tsx:42-392](file://components/admin/LoanRequestDetailsModal.tsx#L42-L392)

### LoanContractModal
**New Component** - Enhanced loan approval process with integrated certificate generation workflow.

Responsibilities:
- **Contract Generation**: Creates loan contracts with customizable field positions and signatories.
- **PDF Generation**: Uses html2canvas and jsPDF to generate high-quality contract PDFs.
- **Field Positioning**: Integrates with ContractPositioningTool for precise field placement.
- **Loan Approval Integration**: Automatically approves loans after successful contract generation.
- **Data Integration**: Receives loan data from LoanRequestsManager and populates contract fields.

Key features:
- Real-time contract preview with ContractPreview component
- Customizable field positions with persistent storage
- Signatory management (Operator, Driver, Co-Maker, Manager)
- Currency formatting and date handling
- Loading states and error handling

**Section sources**
- [LoanContractModal.tsx:11-404](file://components/admin/LoanContractModal.tsx#L11-L404)

### Pagination
Responsibilities:
- Renders pagination controls with ellipsis for large page sets.
- Supports previous/next navigation and direct page selection.
- Responsive design for mobile and desktop.

**Section sources**
- [Pagination.tsx:11-141](file://components/admin/Pagination.tsx#L11-L141)

### useFirestoreData Hook
Responsibilities:
- Subscribes to Firestore collections with filters and applies client-side sorting.
- Avoids composite index requirements by fetching without orderBy and sorting locally.
- Provides loading, error, and refresh states.
- Includes a convenience hook useLoanRequests for loan request status queries.

Refactoring benefits:
- Eliminates the need for composite indexes.
- Simplifies component logic and improves maintainability.
- Centralizes error handling and data normalization.

**Section sources**
- [useFirestoreData.ts:19-182](file://hooks/useFirestoreData.ts#L19-L182)

### Firebase Client Utilities
Responsibilities:
- Wraps Firestore operations with standardized helpers (set, get, query, update, delete).
- Validates Firestore connection and provides detailed error messages.
- Used by components to perform CRUD operations safely.

**Section sources**
- [firebase.ts:90-309](file://lib/firebase.ts#L90-L309)

### Loans API Route
Responsibilities:
- Lists all loans via GET.
- Creates new loans via POST with validation for required fields and numeric types.
- Returns standardized JSON responses using API utilities.

**Section sources**
- [route.ts:1-133](file://app/api/loans/route.ts#L1-L133)
- [apiUtils.ts:8-59](file://lib/apiUtils.ts#L8-L59)

## Dependency Analysis
The LoanRequestsManager depends on:
- useFirestoreData for real-time data and sorting.
- firebase.ts for Firestore operations.
- LoanRequestDetailsModal and Pagination for UI composition.
- **Enhanced**: LoanContractModal for integrated contract generation workflow.
- toast notifications for user feedback.

```mermaid
graph LR
LRM["LoanRequestsManager.tsx"] --> UFD["useFirestoreData.ts"]
LRM --> FB["firebase.ts"]
LRM --> LDM["LoanRequestDetailsModal.tsx"]
LRM --> LCM["LoanContractModal.tsx"]
LRM --> PAG["Pagination.tsx"]
LRM --> API["route.ts (optional)"]
```

**Diagram sources**
- [LoanRequestsManager.tsx:1-1069](file://components/admin/LoanRequestsManager.tsx#L1-L1069)
- [useFirestoreData.ts:1-182](file://hooks/useFirestoreData.ts#L1-L182)
- [firebase.ts:1-309](file://lib/firebase.ts#L1-L309)
- [LoanRequestDetailsModal.tsx:1-392](file://components/admin/LoanRequestDetailsModal.tsx#L1-L392)
- [LoanContractModal.tsx:1-404](file://components/admin/LoanContractModal.tsx#L1-L404)
- [Pagination.tsx:1-141](file://components/admin/Pagination.tsx#L1-L141)
- [route.ts:1-133](file://app/api/loans/route.ts#L1-L133)

**Section sources**
- [LoanRequestsManager.tsx:1-1069](file://components/admin/LoanRequestsManager.tsx#L1-L1069)
- [useFirestoreData.ts:1-182](file://hooks/useFirestoreData.ts#L1-L182)
- [firebase.ts:1-309](file://lib/firebase.ts#L1-L309)
- [LoanRequestDetailsModal.tsx:1-392](file://components/admin/LoanRequestDetailsModal.tsx#L1-L392)
- [LoanContractModal.tsx:1-404](file://components/admin/LoanContractModal.tsx#L1-L404)
- [Pagination.tsx:1-141](file://components/admin/Pagination.tsx#L1-L141)
- [route.ts:1-133](file://app/api/loans/route.ts#L1-L133)

## Performance Considerations
- Composite indexes: The original implementation warns about required composite indexes for efficient querying. See the dedicated documentation for index configurations and deployment instructions.
- Client-side sorting: The refactored hook-based approach avoids composite indexes by fetching without orderBy and sorting locally, trading bandwidth for flexibility.
- Pagination: Items per page is fixed; adjust as needed for large datasets.
- Real-time listeners: Efficiently subscribe to specific status filters to minimize data transfer.
- **Enhanced**: Contract generation performance: The LoanContractModal uses html2canvas with optimized scaling (scale: 2) for better quality while maintaining reasonable processing time.

## Troubleshooting Guide
Common issues and resolutions:
- Firestore index errors: If encountering "failed-precondition" errors, deploy the required composite indexes as documented.
- Data loading errors: The hook displays user-friendly error messages and logs details for debugging.
- UI crashes: Graceful error handling prevents UI crashes from snapshot listener failures.
- **Enhanced**: Contract generation errors: The LoanContractModal handles PDF generation failures gracefully with user feedback and error recovery.

Operational checks:
- Verify Firestore connection and collection existence.
- Confirm that loanRequests and loans collections exist and have proper security rules.
- Ensure the correct query scope and field ordering for indexes.
- **Enhanced**: Verify ContractPositioningTool settings and field position persistence.

**Section sources**
- [FIRESTORE_INDEXES.md:71-110](file://docs/FIRESTORE_INDEXES.md#L71-L110)
- [useFirestoreData.ts:106-116](file://hooks/useFirestoreData.ts#L106-L116)
- [firebase.ts:174-181](file://lib/firebase.ts#L174-L181)
- [LoanContractModal.tsx:120-166](file://components/admin/LoanContractModal.tsx#L120-L166)

## Conclusion
The enhanced loan approval process combines a robust UI with real-time data synchronization, client-side sorting, and standardized backend APIs. The new integrated certificate generation workflow streamlines the approval process by automatically opening the LoanContractModal after approval, allowing administrators to create contracts immediately with proper loan data integration. The system supports role-based actions, comprehensive status tracking, automatic contract generation, and clear user feedback through notifications. The refactored hook-based approach simplifies maintenance and removes strict index requirements, while the original implementation remains viable with proper index deployment.

## Appendices

### Role-Based Approval Mechanism
- The manager exposes approve/reject actions for pending requests.
- Rejection requires a non-empty reason; otherwise, the operation is blocked.
- Approval computes a daily amortization schedule and persists a new loan record.
- **Enhanced**: Automatic contract generation and loan approval workflow integration.

**Section sources**
- [LoanRequestsManager.tsx:257-476](file://components/admin/LoanRequestsManager.tsx#L257-L476)
- [LoanRequestsManager.tsx:954-962](file://components/admin/LoanRequestsManager.tsx#L954-L962)
- [LoanRequestDetailsModal.tsx:66-74](file://components/admin/LoanRequestDetailsModal.tsx#L66-L74)

### Enhanced Approval Workflow Logic
- Automated checks: Client-side validation ensures required fields are present before submission.
- Manual review: The modal presents request details and allows authorized officers to approve or reject.
- **Enhanced**: Contract generation workflow: Automatic LoanContractModal opening and PDF generation.
- **Enhanced**: Automatic loan approval: Loans are automatically approved after successful contract generation.
- Notifications: Toast messages confirm outcomes and surface errors.

**Section sources**
- [LoanRequestsManager.tsx:257-476](file://components/admin/LoanRequestsManager.tsx#L257-L476)
- [LoanRequestsManager.tsx:954-962](file://components/admin/LoanRequestsManager.tsx#L954-L962)
- [LoanRequestsManager.tsx:1052-1065](file://components/admin/LoanRequestsManager.tsx#L1052-L1065)

### LoanRequestsTable Implementation
- Sorting: Client-side sorting by timestamps depending on status.
- Filtering: Search across user name, email, plan name, request ID, and role.
- Pagination: Per-tab pagination with ellipsis navigation.
- Bulk actions: The refactored version demonstrates how to structure bulk operations using the hook-based approach.
- **Enhanced**: Integration with new contract generation workflow.

**Section sources**
- [LoanRequestsManager.tsx:428-448](file://components/admin/LoanRequestsManager.tsx#L428-L448)
- [LoanRequestsManager.tsx:479-492](file://components/admin/LoanRequestsManager.tsx#L479-L492)
- [Pagination.tsx:11-141](file://components/admin/Pagination.tsx#L11-L141)
- [LoanRequestsManagerRefactored.tsx:47-56](file://components/admin/LoanRequestsManagerRefactored.tsx#L47-L56)

### Refactored Version Improvements and Migration Considerations
- Improvements:
  - Eliminates composite index requirements by using client-side sorting.
  - Centralizes data fetching and error handling via a reusable hook.
  - Reduces component complexity and increases testability.
  - **Enhanced**: Integrates new contract generation workflow seamlessly.
- Migration considerations:
  - Replace direct onSnapshot listeners with useLoanRequests hook.
  - Ensure consistent error handling and loading states.
  - Update UI components to consume paginated data from the hook.
  - **Enhanced**: Integrate LoanContractModal state management into existing approval flows.

**Section sources**
- [LoanRequestsManagerRefactored.tsx:14-85](file://components/admin/LoanRequestsManagerRefactored.tsx#L14-L85)
- [useFirestoreData.ts:154-165](file://hooks/useFirestoreData.ts#L154-L165)

### Approval Criteria, Required Documentation Review, Risk Assessment, and Compliance
- Approval criteria:
  - Request status is pending.
  - Sufficient collateral or income verification (as configured in the system).
  - Loan plan eligibility and term alignment.
- Required documentation review:
  - Identity verification, employment or income proof, and collateral documents.
  - Loan application form completion.
- Risk assessment factors:
  - Credit history, debt-to-income ratio, repayment capacity, and guarantor availability.
- Compliance requirements:
  - Adherence to cooperative policies, regulatory limits, and internal audit guidelines.
  - Proper authorization levels for different loan amounts and types.
  - **Enhanced**: Contract compliance and legal requirements for loan agreements.

### Examples of Approval Scenarios, Rejection Reasons, and Escalation Procedures
- Approval scenarios:
  - Standard personal loan under policy limits with complete documentation and good credit history.
  - Group loan with co-signers meeting eligibility criteria.
  - **Enhanced**: Loans requiring immediate contract generation for legal compliance.
- Rejection reasons:
  - Incomplete documentation, insufficient income verification, poor credit history, or policy violations.
- Escalation procedures:
  - High-value loans exceeding officer approval limits are escalated to higher authorities (e.g., chairman or board) for review and approval.
  - **Enhanced**: Contract generation failures require supervisor approval for manual intervention.

### Integrated Certificate Generation Workflow
**New Section** - The enhanced loan approval process now includes seamless certificate generation integration.

Key features:
- **Automatic Contract Opening**: After clicking "Proceed" in the approval confirmation modal, the system automatically opens the LoanContractModal.
- **Contract Data Integration**: LoanContractModal receives comprehensive loan data including request ID, user ID, plan details, amount, term, interest rate, borrower information, and email.
- **PDF Generation**: Contracts are generated using html2canvas and jsPDF with high-quality output.
- **Automatic Loan Approval**: Once contract generation is successful, the loan is automatically approved and a loan record is created.
- **Field Positioning**: Integration with ContractPositioningTool allows precise control over contract field placement.
- **Signatory Management**: Automatic population of officer names (Manager, Operator, Driver, Co-Maker) from the system.

**Section sources**
- [LoanRequestsManager.tsx:954-962](file://components/admin/LoanRequestsManager.tsx#L954-L962)
- [LoanRequestsManager.tsx:1044-1066](file://components/admin/LoanRequestsManager.tsx#L1044-L1066)
- [LoanContractModal.tsx:11-404](file://components/admin/LoanContractModal.tsx#L11-L404)
- [LoanContractModal.tsx:120-166](file://components/admin/LoanContractModal.tsx#L120-L166)