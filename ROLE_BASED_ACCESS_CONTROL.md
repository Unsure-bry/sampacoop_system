# Role-Based Access Control System

This document describes the implementation of the role-based access control (RBAC) system for the SAMPA Cooperative Management System.

## Overview

The RBAC system ensures that every registered account is automatically redirected to their correct dashboard based on their assigned role. The system prevents users from accessing dashboards that do not match their role and maintains role consistency in Firestore.

## Supported Roles

### Admin Roles
- **Admin** → `/admin/dashboard`
- **Secretary** → `/admin/secretary/home`
- **Chairman** → `/admin/chairman/home`
- **Vice Chairman** → `/admin/vice-chairman/home`
- **Manager** → `/admin/manager/home`
- **Treasurer** → `/admin/treasurer/home`
- **Board of Directors** → `/admin/bod/home`

### User Roles
- **Member** → `/dashboard`
- **Driver** → `/driver/dashboard`
- **Operator** → `/operator/dashboard`

## Implementation Details

### 1. Authentication Flow

1. User submits login credentials
2. System validates credentials against Firestore database
3. System fetches user record including role
4. System validates that the account exists and has a role assigned
5. System automatically redirects user to their role-specific dashboard

### 2. Route Validation

The middleware validates route access based on user roles:
- Admin roles can only access admin routes
- User roles can only access user routes
- Unauthorized access attempts are redirected to appropriate login pages

### 3. Dashboard Redirection

The [getDashboardPath](file:///c:/Users/User/OneDrive/Desktop/SAMPA-Coop/sampacoop/lib/auth.tsx#L46-L92) function determines the correct dashboard path based on user role:
- Role validation is case-insensitive
- Whitespace is trimmed from role values
- Invalid roles are redirected to the login page

### 4. New Member Registration

- Newly registered members can log in immediately
- Role is assigned during registration process
- Routing depends on database data, not hardcoded values

## Security Features

1. **Role Validation**: All roles are validated against a predefined list
2. **Case Insensitivity**: Role comparisons are case-insensitive
3. **Whitespace Handling**: Leading/trailing whitespace is trimmed
4. **Invalid Role Handling**: Invalid roles redirect to login page
5. **Route Protection**: Middleware prevents unauthorized route access

## Testing

The system includes comprehensive tests to verify:
- Correct dashboard routing for all supported roles
- Case insensitivity handling
- Whitespace trimming
- Invalid role handling
- Route access validation

Run tests with:
```bash
node scripts/test-role-based-routing.js
```

## Error Handling

- Missing roles redirect to login page with clear error message
- Invalid roles redirect to login page with clear error message
- Database errors are logged and handled gracefully
- Network errors are caught and displayed to users

## Future Enhancements

1. Role hierarchy implementation
2. Dynamic role management
3. Permission-based access control
4. Audit logging for role changes