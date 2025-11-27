# Savings Components

This directory contains components related to the savings functionality of the application.

## Components

- `AddSavingsModal.tsx` - Modal for adding new savings transactions
- `index.ts` - Barrel export file for easy imports

## Usage

```tsx
import { AddSavingsModal } from '@/components/admin';
```

## Data Structure

Savings transactions are stored in Firestore under:
- Collection path: `/members/{memberId}/savings`
- Each document represents a single transaction with the following fields:
  - `id`: Transaction ID
  - `memberId`: Member's ID
  - `memberName`: Member's full name
  - `date`: Transaction date
  - `type`: 'deposit' or 'withdrawal'
  - `amount`: Transaction amount
  - `balance`: Running balance after transaction
  - `remarks`: Optional remarks
  - `createdAt`: Timestamp when transaction was created