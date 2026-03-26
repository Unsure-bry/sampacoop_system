# UI Components & Design System

<cite>
**Referenced Files in This Document**
- [components/index.ts](file://components/index.ts)
- [components/shared/Header.tsx](file://components/shared/Header.tsx)
- [components/shared/Footer.tsx](file://components/shared/Footer.tsx)
- [components/shared/Card.tsx](file://components/shared/Card.tsx)
- [components/shared/CollapsibleSidebar.tsx](file://components/shared/CollapsibleSidebar.tsx)
- [components/shared/LoanLayout.tsx](file://components/shared/LoanLayout.tsx)
- [components/auth/AuthLayout.tsx](file://components/auth/AuthLayout.tsx)
- [components/auth/Button.tsx](file://components/auth/Button.tsx)
- [components/auth/Input.tsx](file://components/auth/Input.tsx)
- [components/admin/Header.tsx](file://components/admin/Header.tsx)
- [components/admin/Footer.tsx](file://components/admin/Footer.tsx)
- [components/admin/Card.tsx](file://components/admin/Card.tsx)
- [components/admin/MemberDetailsModal.tsx](file://components/admin/MemberDetailsModal.tsx)
- [components/admin/MemberEditModal.tsx](file://components/admin/MemberEditModal.tsx)
- [components/admin/CertificatePreviewModal.tsx](file://components/admin/CertificatePreviewModal.tsx)
- [components/admin/CertificateGenerator.tsx](file://components/admin/CertificateGenerator.tsx)
- [components/user/ActiveLoans.tsx](file://components/user/ActiveLoans.tsx)
- [components/user/LoanApplicationModal.tsx](file://components/user/LoanApplicationModal.tsx)
- [components/user/LoanRequestForm.tsx](file://components/user/LoanRequestForm.tsx)
- [lib/auth.tsx](file://lib/auth.tsx)
- [lib/certificateService.ts](file://lib/certificateService.ts)
- [lib/sidebarConfig.ts](file://lib/sidebarConfig.ts)
- [app/layout.tsx](file://app/layout.tsx)
</cite>

## Update Summary
**Changes Made**
- Enhanced MemberDetailsModal with improved certificate preview display in responsive layout
- Improved MemberEditModal with refined input visibility styling and better form controls
- Added CertificatePreviewModal for advanced certificate generation with PDF export capabilities
- Enhanced responsive design patterns across all modal components
- Improved form validation and error handling in member management components

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Enhanced Modal Components](#enhanced-modal-components)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)
11. [Appendices](#appendices)

## Introduction
This document describes the UI Components & Design System of the SAMPA Cooperative Management Platform. It focuses on the shared component library (Header, Footer, Card, CollapsibleSidebar), authentication-focused components (AuthLayout, Button, Input), and enhanced modal components for member management and certificate generation. The system has been recently updated with improved modal styling, better responsive design, and refined form controls, particularly in MemberDetailsModal and MemberEditModal for displaying certificate previews and improving input visibility.

## Project Structure
The UI components are organized by domain and shared usage:
- Shared components under components/shared are used across user dashboards and loan/savings contexts.
- Authentication components under components/auth provide secure input and button primitives and an auth layout container.
- Admin components under components/admin encapsulate admin panel UI elements with enhanced modal functionality.
- User components under components/user implement member-facing features such as active loans display and loan application workflows.
- Certificate generation components provide advanced PDF creation and preview capabilities.

```mermaid
graph TB
subgraph "Root"
L["app/layout.tsx"]
end
subgraph "Shared"
SH["shared/Header.tsx"]
SF["shared/Footer.tsx"]
SC["shared/Card.tsx"]
SCS["shared/CollapsibleSidebar.tsx"]
SLL["shared/LoanLayout.tsx"]
end
subgraph "Auth"
AL["auth/AuthLayout.tsx"]
AB["auth/Button.tsx"]
AI["auth/Input.tsx"]
end
subgraph "Admin"
AH["admin/Header.tsx"]
AFF["admin/Footer.tsx"]
AC["admin/Card.tsx"]
AMD["admin/MemberDetailsModal.tsx"]
AEM["admin/MemberEditModal.tsx"]
CCM["admin/CertificatePreviewModal.tsx"]
CG["admin/CertificateGenerator.tsx"]
end
subgraph "User"
UL["user/ActiveLoans.tsx"]
ULA["user/LoanApplicationModal.tsx"]
ULF["user/LoanRequestForm.tsx"]
end
subgraph "Lib"
AU["lib/auth.tsx"]
ACS["lib/certificateService.ts"]
ASC["lib/sidebarConfig.ts"]
end
L --> AU
L --> AL
L --> SLL
SLL --> SCS
SLL --> UL
SLL --> ULF
AL --> AB
AL --> AI
AH --> AU
SCS --> AU
UL --> AU
ULF --> AU
AMD --> ACS
AEM --> AU
CCM --> ACS
CG --> ACS
```

**Diagram sources**
- [app/layout.tsx:22-37](file://app/layout.tsx#L22-L37)
- [components/shared/LoanLayout.tsx:18-41](file://components/shared/LoanLayout.tsx#L18-L41)
- [components/shared/CollapsibleSidebar.tsx:74-80](file://components/shared/CollapsibleSidebar.tsx#L74-L80)
- [components/admin/Header.tsx:37-43](file://components/admin/Header.tsx#L37-L43)
- [components/admin/MemberDetailsModal.tsx:233-400](file://components/admin/MemberDetailsModal.tsx#L233-L400)
- [components/admin/MemberEditModal.tsx:292-823](file://components/admin/MemberEditModal.tsx#L292-L823)
- [components/admin/CertificatePreviewModal.tsx:327-665](file://components/admin/CertificatePreviewModal.tsx#L327-L665)
- [components/admin/CertificateGenerator.tsx:1-410](file://components/admin/CertificateGenerator.tsx#L1-L410)
- [lib/certificateService.ts:12-294](file://lib/certificateService.ts#L12-L294)

**Section sources**
- [app/layout.tsx:22-37](file://app/layout.tsx#L22-L37)
- [components/index.ts:1-14](file://components/index.ts#L1-L14)

## Core Components
This section documents the shared component library and authentication-focused components.

- Shared Header
  - Purpose: Fixed top bar with branding, navigation links, and a mobile menu indicator.
  - Props: None.
  - Customization: Adjust color classes and link targets for branding and navigation changes.
  - Accessibility: Add aria-labels to links and ensure keyboard navigation.
  - Responsive: Uses hidden and md: visibility utilities for mobile/desktop.

- Shared Footer
  - Purpose: Fixed bottom bar with copyright and version info.
  - Props: None.
  - Customization: Modify text and styling classes for branding.

- Shared Card
  - Purpose: Consistent card container with title and children.
  - Props:
    - title: string
    - children: ReactNode
    - className?: string
  - Customization: Pass additional Tailwind classes via className.

- CollapsibleSidebar
  - Purpose: Left sidebar with navigation items, icons, active highlighting, and logout.
  - Props:
    - collapsed: boolean
    - onToggle: () => void
  - Behavior: Uses Next.js usePathname for active highlight; integrates with AuthContext for logout; triggers centralized logout utility.
  - Accessibility: Ensure focus styles and keyboard operability for nav items and logout button.

- LoanLayout
  - Purpose: Layout wrapper for loan pages with collapsible sidebar and main content area.
  - Props:
    - children: ReactNode
  - State: Manages sidebarCollapsed state locally.
  - Integration: Renders CollapsibleSidebar and passes state callbacks.

- AuthLayout
  - Purpose: Centered auth container with title and optional subtitle.
  - Props:
    - children: ReactNode
    - title: string
    - subtitle?: string
  - Customization: Adjust spacing and shadow classes for branding.

- Button
  - Purpose: Reusable button with primary/secondary variants and loading state.
  - Props:
    - children: ReactNode
    - isLoading?: boolean
    - variant?: 'primary' | 'secondary'
    - ...button attributes
  - Behavior: Disables when isLoading or disabled; shows spinner when loading.

- Input
  - Purpose: Styled input with label and optional error messaging.
  - Props:
    - label: string
    - error?: string
    - ...input attributes
  - Behavior: Applies error-specific border class; forwards additional props to input element.

**Section sources**
- [components/shared/Header.tsx:4-26](file://components/shared/Header.tsx#L4-L26)
- [components/shared/Footer.tsx:1-9](file://components/shared/Footer.tsx#L1-L9)
- [components/shared/Card.tsx:3-16](file://components/shared/Card.tsx#L3-L16)
- [components/shared/CollapsibleSidebar.tsx:74-80](file://components/shared/CollapsibleSidebar.tsx#L74-L80)
- [components/shared/LoanLayout.tsx:18-41](file://components/shared/LoanLayout.tsx#L18-L41)
- [components/auth/AuthLayout.tsx:9-23](file://components/auth/AuthLayout.tsx#L9-L23)
- [components/auth/Button.tsx:8-13](file://components/auth/Button.tsx#L8-L13)
- [components/auth/Input.tsx:8-27](file://components/auth/Input.tsx#L8-L27)

## Architecture Overview
The design system centers around:
- Global AuthProvider that exposes user state, login/logout, and profile updates.
- Shared components for consistent UI across dashboards.
- Role-aware navigation and layouts for admin and user dashboards.
- Enhanced modal components for complex workflows with certificate generation capabilities.
- Advanced certificate service integration for PDF creation and member management.

```mermaid
sequenceDiagram
participant User as "User"
participant Page as "Page Component"
participant Auth as "Auth Context"
participant API as "Auth API Route"
participant Modal as "Enhanced Modal"
participant CertService as "Certificate Service"
User->>Page : "Submit Member Edit Form"
Page->>Auth : "Update Member Data"
Auth->>Modal : "Show Certificate Preview"
Modal->>CertService : "Generate Certificate"
CertService->>CertService : "Create PDF with jsPDF"
CertService-->>Modal : "Return Certificate Data"
Modal-->>Page : "Display Certificate Preview"
Page->>Auth : "Save Member Changes"
Auth-->>Page : "Update Complete"
```

**Diagram sources**
- [lib/auth.tsx:197-348](file://lib/auth.tsx#L197-L348)
- [components/admin/MemberEditModal.tsx:179-276](file://components/admin/MemberEditModal.tsx#L179-L276)
- [components/admin/CertificatePreviewModal.tsx:160-168](file://components/admin/CertificatePreviewModal.tsx#L160-L168)
- [lib/certificateService.ts:12-294](file://lib/certificateService.ts#L12-L294)

## Detailed Component Analysis

### Shared Components

#### CollapsibleSidebar
- Composition pattern: Stateless functional component receiving collapsed and onToggle props; renders navigation items with icons and a logout button.
- State management: Controlled via parent (LoanLayout) state; toggles collapsed state.
- Event handling: onClick handlers for toggle and logout; logout triggers AuthContext.logout and centralized logout utility.
- Accessibility: Add aria-current for active link; ensure focus-visible styles.

```mermaid
flowchart TD
Start(["Toggle Click"]) --> ToggleState["Toggle collapsed state"]
ToggleState --> Render["Re-render with width classes"]
Render --> NavClick{"Navigation Item Click?"}
NavClick --> |Yes| Navigate["Navigate to path"]
NavClick --> |No| LogoutClick{"Logout Click?"}
LogoutClick --> |Yes| AuthLogout["Call AuthContext.logout()"]
AuthLogout --> UtilsLogout["Call centralized logout utility"]
UtilsLogout --> End(["Redirect and clear state"])
LogoutClick --> |No| End
```

**Diagram sources**
- [components/shared/CollapsibleSidebar.tsx:84-95](file://components/shared/CollapsibleSidebar.tsx#L84-L95)
- [lib/auth.tsx:621-635](file://lib/auth.tsx#L621-L635)

**Section sources**
- [components/shared/CollapsibleSidebar.tsx:74-80](file://components/shared/CollapsibleSidebar.tsx#L74-L80)
- [lib/auth.tsx:621-635](file://lib/auth.tsx#L621-L635)

#### LoanLayout
- Composition pattern: Wraps children with a two-column layout; left sidebar is CollapsibleSidebar; right is main content area.
- State management: Local useState for sidebarCollapsed; passes callback to CollapsibleSidebar.
- Responsive: Uses flexbox and Tailwind utilities for responsive behavior.

```mermaid
sequenceDiagram
participant Parent as "Parent Page"
participant LL as "LoanLayout"
participant CS as "CollapsibleSidebar"
Parent->>LL : "Render with children"
LL->>LL : "useState(false) for collapsed"
LL->>CS : "Pass collapsed and onToggle"
CS-->>LL : "onToggle() invoked"
LL->>LL : "setSidebarCollapsed(!collapsed)"
LL-->>Parent : "Render updated layout"
```

**Diagram sources**
- [components/shared/LoanLayout.tsx:18-41](file://components/shared/LoanLayout.tsx#L18-L41)
- [components/shared/CollapsibleSidebar.tsx:74-80](file://components/shared/CollapsibleSidebar.tsx#L74-L80)

**Section sources**
- [components/shared/LoanLayout.tsx:18-41](file://components/shared/LoanLayout.tsx#L18-L41)

### Authentication Components

#### AuthLayout
- Purpose: Centers auth forms with title and optional subtitle inside a card-like container.
- Props: children, title, subtitle.
- Usage: Wrap auth forms (login/register) to enforce consistent branding and spacing.

**Section sources**
- [components/auth/AuthLayout.tsx:9-23](file://components/auth/AuthLayout.tsx#L9-L23)

#### Button
- Props: isLoading, variant, and standard button attributes.
- Variants: primary and secondary with distinct focus rings and hover states.
- Loading: Spinner animation when isLoading; disables button.

**Section sources**
- [components/auth/Button.tsx:8-13](file://components/auth/Button.tsx#L8-L13)

#### Input
- Props: label, error, and standard input attributes.
- Behavior: Applies error border class; displays error message below input.

**Section sources**
- [components/auth/Input.tsx:8-27](file://components/auth/Input.tsx#L8-L27)

### Admin Components

#### Admin Header
- Purpose: Top navigation bar with sidebar toggle, title, and user dropdown with logout.
- Props: sidebarCollapsed, onToggleSidebar.
- Behavior: Uses AuthContext.user and logout; manages dropdown visibility.

**Section sources**
- [components/admin/Header.tsx:37-43](file://components/admin/Header.tsx#L37-L43)

#### Admin Footer
- Purpose: Fixed footer with copyright and version info.
- Props: None.

**Section sources**
- [components/admin/Footer.tsx:8-23](file://components/admin/Footer.tsx#L8-L23)

#### Admin Card
- Purpose: Card with optional title and content padding.
- Props: title?, children, className?.

**Section sources**
- [components/admin/Card.tsx:14-35](file://components/admin/Card.tsx#L14-L35)

### User Components

#### ActiveLoans
- Purpose: Displays a user's active loans with formatted currency/date and retry mechanism.
- State: loading, error, loans array.
- Data: Fetches from Firestore using a query with userId and status filters; formats currency and dates.
- Events: Retry button re-invokes fetch.

```mermaid
flowchart TD
Init["Mount with user"] --> Fetch["Fetch active loans"]
Fetch --> Success{"Success?"}
Success --> |Yes| SetData["Set loans state"]
Success --> |No| HandleErr["Set error and show message"]
SetData --> Render["Render cards with details"]
HandleErr --> Render
Render --> Retry["Retry button click"]
Retry --> Fetch
```

**Diagram sources**
- [components/user/ActiveLoans.tsx:25-72](file://components/user/ActiveLoans.tsx#L25-L72)

**Section sources**
- [components/user/ActiveLoans.tsx:19-177](file://components/user/ActiveLoans.tsx#L19-L177)

#### LoanRequestForm
- Purpose: Allows a user to submit a general loan request with amount, term, and optional description.
- State: amount, term, description, loading.
- Validation: Numeric checks for amount and term; fetches member info from Firestore to enrich payload.
- Submission: Posts to Firestore under loanRequests with status pending.

**Section sources**
- [components/user/LoanRequestForm.tsx:12-223](file://components/user/LoanRequestForm.tsx#L12-L223)

#### LoanApplicationModal
- Purpose: Modal for applying to a specific loan plan with plan details, amount, and term selection.
- State: amount, term, loading; resets on close.
- Validation: Enforces plan max amount and valid term options; submits to loanRequests.
- Integration: Uses AuthContext.user and router for navigation.

**Section sources**
- [components/user/LoanApplicationModal.tsx:16-200](file://components/user/LoanApplicationModal.tsx#L16-L200)

### Authentication Context Integration
- AuthProvider exposes user, loading, signIn, signUp, createUser, customLogin, logout, resetPassword, updateProfile.
- Components consume useAuth to access user state and call logout.
- Centralized logout clears cookies and user state.

```mermaid
classDiagram
class AuthProvider {
+user
+loading
+signIn(email, password)
+signUp(email, password, fullName)
+createUser(params)
+customLogin(email, password)
+logout()
+resetPassword(email)
+updateProfile(data)
}
class CollapsibleSidebar {
+props collapsed
+props onToggle
+logout()
}
class ActiveLoans {
+useEffect(fetch)
+formatCurrency()
+formatDate()
}
class LoanRequestForm {
+handleSubmit()
}
class LoanApplicationModal {
+handleSubmit()
}
class MemberDetailsModal {
+toggleCertificateView()
+certificatePreview()
}
class MemberEditModal {
+formValidation()
+stepNavigation()
}
class CertificatePreviewModal {
+generatePDF()
+previewCertificate()
}
CollapsibleSidebar --> AuthProvider : "useAuth().logout()"
ActiveLoans --> AuthProvider : "useAuth().user"
LoanRequestForm --> AuthProvider : "useAuth().user"
LoanApplicationModal --> AuthProvider : "useAuth().user"
MemberDetailsModal --> AuthProvider : "useAuth().user"
MemberEditModal --> AuthProvider : "useAuth().user"
CertificatePreviewModal --> AuthProvider : "useAuth().user"
```

**Diagram sources**
- [lib/auth.tsx:158-682](file://lib/auth.tsx#L158-L682)
- [components/shared/CollapsibleSidebar.tsx:82-89](file://components/shared/CollapsibleSidebar.tsx#L82-L89)
- [components/user/ActiveLoans.tsx:20-29](file://components/user/ActiveLoans.tsx#L20-L29)
- [components/user/LoanRequestForm.tsx:13-17](file://components/user/LoanRequestForm.tsx#L13-L17)
- [components/user/LoanApplicationModal.tsx:17-21](file://components/user/LoanApplicationModal.tsx#L17-L21)
- [components/admin/MemberDetailsModal.tsx:233-400](file://components/admin/MemberDetailsModal.tsx#L233-L400)
- [components/admin/MemberEditModal.tsx:292-823](file://components/admin/MemberEditModal.tsx#L292-L823)
- [components/admin/CertificatePreviewModal.tsx:327-665](file://components/admin/CertificatePreviewModal.tsx#L327-L665)

**Section sources**
- [lib/auth.tsx:158-682](file://lib/auth.tsx#L158-L682)

## Enhanced Modal Components

### MemberDetailsModal
**Updated** Enhanced with improved certificate preview display in responsive layout

- Purpose: Comprehensive member details display with certificate preview functionality.
- Props: member, isOpen, onClose, onMarkInactive.
- State: showCertificate, showInactiveConfirm, isMarkingInactive.
- Features: Responsive certificate preview with dynamic text overlays, conditional visibility based on certificate generation status, and confirmation dialogs for sensitive operations.

```mermaid
flowchart TD
Open(["Modal Open"]) --> Init["Initialize State"]
Init --> CheckCert{"Certificate Generated?"}
CheckCert --> |Yes| ShowPreview["Display Certificate Preview"]
CheckCert --> |No| HidePreview["Hide Certificate Controls"]
ShowPreview --> Toggle["User Toggles View"]
Toggle --> Render["Render Certificate with Text Overlays"]
Render --> Actions["Show Action Buttons"]
HidePreview --> Actions
Actions --> MarkInactive{"Mark as Inactive?"}
MarkInactive --> |Yes| Confirm["Show Confirmation Modal"]
Confirm --> Process["Process Archive Operation"]
Process --> Close["Close Modal"]
MarkInactive --> |No| Close
```

**Diagram sources**
- [components/admin/MemberDetailsModal.tsx:233-400](file://components/admin/MemberDetailsModal.tsx#L233-L400)
- [components/admin/MemberDetailsModal.tsx:430-510](file://components/admin/MemberDetailsModal.tsx#L430-L510)

**Section sources**
- [components/admin/MemberDetailsModal.tsx:10-513](file://components/admin/MemberDetailsModal.tsx#L10-L513)

### MemberEditModal
**Updated** Improved input visibility styling and enhanced form controls

- Purpose: Multi-step member editing form with role-specific fields and validation.
- Props: member, isOpen, onClose, onMemberUpdated.
- State: currentStep, role, form validation errors.
- Features: Three-step wizard interface, dynamic role-specific fields, real-time validation, and comprehensive form state management.

```mermaid
sequenceDiagram
participant User as "User"
participant Modal as "MemberEditModal"
participant Form as "Multi-step Form"
participant Validation as "Validation Engine"
User->>Modal : "Open Edit Modal"
Modal->>Form : "Initialize with Member Data"
Form->>Validation : "Setup Form Validation"
Validation-->>Form : "Validation Rules Applied"
Form-->>User : "Display Step 1 : Personal Info"
User->>Form : "Fill Personal Information"
Form->>Validation : "Validate Step 1"
Validation-->>Form : "Validation Result"
Form-->>User : "Next Step Available"
User->>Form : "Proceed to Step 2"
Form-->>User : "Display Role-specific Fields"
User->>Form : "Complete Role Information"
Form->>Validation : "Validate Step 2"
Validation-->>Form : "Validation Result"
Form-->>User : "Next Step Available"
User->>Form : "Proceed to Step 3"
Form-->>User : "Display Confirmation"
User->>Form : "Submit Form"
Form->>Modal : "Process Update"
Modal-->>User : "Show Success Toast"
```

**Diagram sources**
- [components/admin/MemberEditModal.tsx:73-177](file://components/admin/MemberEditModal.tsx#L73-L177)
- [components/admin/MemberEditModal.tsx:179-276](file://components/admin/MemberEditModal.tsx#L179-L276)

**Section sources**
- [components/admin/MemberEditModal.tsx:62-823](file://components/admin/MemberEditModal.tsx#L62-L823)

### CertificatePreviewModal
**New** Advanced certificate generation with PDF export capabilities

- Purpose: Comprehensive certificate preview and generation interface with PDF export functionality.
- Props: isOpen, onClose, onConfirm, memberData, isGenerating.
- Features: Real-time certificate preview with customizable text overlays, PDF generation using jsPDF, print functionality, and confirmation workflow.

```mermaid
flowchart TD
Open(["Preview Modal Open"]) --> LoadData["Load Member Data"]
LoadData --> FetchOfficers["Fetch Officer Names"]
FetchOfficers --> SetupPreview["Setup Certificate Preview"]
SetupPreview --> UserEdit["User Edits Certificate Details"]
UserEdit --> Validate["Validate Inputs"]
Validate --> |Valid| Ready["Ready for Generation"]
Validate --> |Invalid| ShowErrors["Show Validation Errors"]
Ready --> Action{"User Action"}
Action --> |Print| PrintPDF["Generate and Print PDF"]
Action --> |Download| DownloadPDF["Download PDF"]
Action --> |Save| ConfirmSave["Show Confirmation"]
Action --> |Cancel| CloseModal["Close Modal"]
PrintPDF --> SaveData["Save Certificate Data"]
DownloadPDF --> SaveData
ConfirmSave --> SaveData
SaveData --> CloseModal
ShowErrors --> UserEdit
```

**Diagram sources**
- [components/admin/CertificatePreviewModal.tsx:115-150](file://components/admin/CertificatePreviewModal.tsx#L115-L150)
- [components/admin/CertificatePreviewModal.tsx:160-168](file://components/admin/CertificatePreviewModal.tsx#L160-L168)
- [components/admin/CertificatePreviewModal.tsx:265-323](file://components/admin/CertificatePreviewModal.tsx#L265-L323)

**Section sources**
- [components/admin/CertificatePreviewModal.tsx:26-665](file://components/admin/CertificatePreviewModal.tsx#L26-L665)

### CertificateGenerator
**New** Backend service for certificate generation and storage

- Purpose: Server-side certificate generation with PDF creation and Firebase storage integration.
- Features: Advanced PDF generation using jsPDF, automatic member data updates, email notification integration, and certificate storage management.

**Section sources**
- [components/admin/CertificateGenerator.tsx:1-410](file://components/admin/CertificateGenerator.tsx#L1-L410)

### Certificate Service Integration
**Updated** Enhanced certificate service with improved error handling and validation

- Purpose: Centralized certificate management service with comprehensive functionality.
- Features: Certificate generation, retrieval, email notification, and data validation with comprehensive error handling.

**Section sources**
- [lib/certificateService.ts:12-410](file://lib/certificateService.ts#L12-L410)

## Dependency Analysis
- Shared components depend on Next.js routing (usePathname) and the AuthContext for logout.
- LoanLayout composes CollapsibleSidebar and user components.
- Admin components depend on AuthContext for user profile and logout.
- User components depend on AuthContext for user identity and on Firestore utilities for data operations.
- Enhanced modal components integrate with certificate service for advanced functionality.
- Certificate generation components utilize jsPDF for PDF creation and html2canvas for image capture.

```mermaid
graph LR
AU["lib/auth.tsx"] --> SCS["shared/CollapsibleSidebar.tsx"]
AU --> AH["admin/Header.tsx"]
AU --> UL["user/ActiveLoans.tsx"]
AU --> ULF["user/LoanRequestForm.tsx"]
AU --> ULA["user/LoanApplicationModal.tsx"]
AU --> AMD["admin/MemberDetailsModal.tsx"]
AU --> AEM["admin/MemberEditModal.tsx"]
SLL["shared/LoanLayout.tsx"] --> SCS
SLL --> UL
SLL --> ULF
AL["auth/AuthLayout.tsx"] --> AB["auth/Button.tsx"]
AL --> AI["auth/Input.tsx"]
ACS["lib/certificateService.ts"] --> AMD
ACS --> AEM
ACS --> CCM["admin/CertificatePreviewModal.tsx"]
ACS --> CG["admin/CertificateGenerator.tsx"]
```

**Diagram sources**
- [lib/auth.tsx:158-682](file://lib/auth.tsx#L158-L682)
- [components/shared/LoanLayout.tsx:18-41](file://components/shared/LoanLayout.tsx#L18-L41)
- [components/shared/CollapsibleSidebar.tsx:82-89](file://components/shared/CollapsibleSidebar.tsx#L82-L89)
- [components/admin/Header.tsx:44-59](file://components/admin/Header.tsx#L44-L59)
- [components/admin/MemberDetailsModal.tsx:233-400](file://components/admin/MemberDetailsModal.tsx#L233-L400)
- [components/admin/MemberEditModal.tsx:179-276](file://components/admin/MemberEditModal.tsx#L179-L276)
- [components/admin/CertificatePreviewModal.tsx:160-168](file://components/admin/CertificatePreviewModal.tsx#L160-L168)
- [components/admin/CertificateGenerator.tsx:1-410](file://components/admin/CertificateGenerator.tsx#L1-L410)
- [lib/certificateService.ts:12-294](file://lib/certificateService.ts#L12-L294)

**Section sources**
- [lib/sidebarConfig.ts:29-262](file://lib/sidebarConfig.ts#L29-L262)

## Performance Considerations
- Prefer server components where appropriate; keep interactive components client-side with 'use client'.
- Memoize expensive computations (e.g., currency/date formatting) and avoid unnecessary re-renders by passing stable callbacks.
- Lazy-load heavy modals and tables; use virtualization for long lists.
- Minimize Tailwind classes per render; extract repeated class sets into constants.
- Debounce or throttle rapid user interactions (e.g., search or filter inputs).
- Use Suspense boundaries for data fetching to improve perceived performance.
- Optimize certificate generation by implementing lazy loading for PDF libraries.
- Implement proper cleanup for modal components to prevent memory leaks.
- Use efficient state management for multi-step forms to minimize re-renders.

## Troubleshooting Guide
- Authentication state not persisting:
  - Verify cookies are being set after login and cleared on logout.
  - Check AuthProvider initialization and useEffect logic for loading user from cookies.
- Logout not redirecting:
  - Ensure logout calls clearAllAuthData and redirects occur after state is cleared.
- Loan data not loading:
  - Confirm user is authenticated and Firestore is initialized; verify query filters and error handling paths.
- Sidebar navigation not highlighting:
  - Ensure usePathname matches the current path and that navigation items use the same paths.
- Certificate preview not displaying:
  - Verify certificate data exists in Firestore and member has shareCertificateGenerated flag set.
  - Check image loading and background positioning for certificate template.
- PDF generation failing:
  - Ensure jsPDF and html2canvas libraries are properly loaded.
  - Verify certificate data formatting and text overlay positioning.
- Modal components not closing:
  - Check event handlers and state management for proper cleanup.
  - Verify escape key listeners and click-outside functionality.

**Section sources**
- [lib/auth.tsx:164-195](file://lib/auth.tsx#L164-L195)
- [lib/auth.tsx:621-635](file://lib/auth.tsx#L621-L635)
- [components/user/ActiveLoans.tsx:31-72](file://components/user/ActiveLoans.tsx#L31-L72)
- [components/shared/CollapsibleSidebar.tsx:81-82](file://components/shared/CollapsibleSidebar.tsx#L81-L82)
- [components/admin/MemberDetailsModal.tsx:233-400](file://components/admin/MemberDetailsModal.tsx#L233-L400)
- [components/admin/CertificatePreviewModal.tsx:170-263](file://components/admin/CertificatePreviewModal.tsx#L170-L263)

## Conclusion
The SAMPA Cooperative Management Platform employs a modular, role-aware design system built on shared components, a robust authentication context, and enhanced modal components with advanced certificate generation capabilities. The recent updates have significantly improved the user experience with better responsive design, refined form controls, and comprehensive certificate management functionality. The shared components (Header, Footer, Card, CollapsibleSidebar) and authentication primitives (AuthLayout, Button, Input) provide a cohesive user experience across dashboards, while the enhanced modal components offer sophisticated member management and certificate generation workflows. The system leverages Tailwind CSS for responsive design, integrates tightly with the AuthContext for secure interactions, and offers extensive extensibility through well-defined props and composition patterns.

## Appendices

### Responsive Design and Tailwind Utilities
- Mobile-first approach: Hidden and md: visibility utilities control desktop vs. mobile views.
- Spacing and padding: Use p-4/md:p-6 for scalable spacing across breakpoints.
- Width and layout: w-full, max-w-md, flex-1, and grid utilities adapt to screen sizes.
- Enhanced modal responsiveness: Certificate previews use flexible width and aspect ratio calculations.
- Grid layouts: Responsive grid systems adapt to different screen sizes with appropriate column configurations.

### Accessibility Checklist
- Ensure all interactive elements have focus indicators and keyboard operability.
- Provide aria-current for active navigation items.
- Use semantic labels and descriptions for inputs and buttons.
- Test color contrast and ensure sufficient text sizes.
- Implement proper ARIA attributes for modal components and certificate previews.
- Ensure screen reader compatibility for dynamic content updates.

### Cross-Browser Compatibility
- Use standard HTML and CSS; avoid experimental APIs without polyfills.
- Validate Tailwind utilities across browsers; prefer widely supported features.
- Test form controls and focus states on major browsers.
- Verify PDF generation compatibility across different browser environments.
- Ensure certificate preview functionality works consistently across platforms.

### Extending the Component Library
- Follow existing prop interfaces and className extension patterns.
- Encapsulate state in parent components when appropriate (as seen in LoanLayout).
- Centralize shared logic (e.g., logout) in utilities or context providers.
- Document props and customization options for maintainability.
- Implement proper error boundaries for modal components.
- Add comprehensive prop validation and default value handling.
- Ensure consistent styling patterns across all component variations.