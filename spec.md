# DSK Management System

## Current State
Version 36 frontend with backend locked. App expired causing data loss again. Backend has: createCustomer, updateCustomer, softDeleteCustomer, addRenewalRecord, getCustomerRenewalHistory, addExpense, deleteExpense. No delete/update methods for renewal records. No getAllRenewalHistory method.

## Requested Changes (Diff)

### Add
- Backend: `getAllRenewalHistory()` - returns all renewal records across all customers
- Backend: `deleteRenewalRecord(id)` - delete a renewal record by ID
- Backend: `updateRenewalRecord(id, input)` - edit an existing renewal record
- Renewals page: "Renewal History" tab showing all past renewals across all customers
- CustomerDetail: Delete button on each renewal history row
- CustomerDetail: Edit button on each renewal history row (opens modal with prefilled data)
- html2canvas package for invoice image capture
- Invoice: Share button captures invoice as image and shares via Web Share API (not text)
- Invoice: PDF download uses proper 80mm thermal width (not A4)

### Modify
- PrintInvoice: `printInNewWindow` CSS must use `size: 80mm auto` with correct media queries to force thermal dimensions
- PrintInvoice: `handleShare` must capture invoice as image (html2canvas) and share as image file
- CustomerForm: Improve connection error handling and button state management
- Renewals page: Add tabs for "Upcoming" and "History"

### Remove
- Invoice share that sends text-only WhatsApp message

## Implementation Plan
1. Update backend main.mo: add getAllRenewalHistory, deleteRenewalRecord, updateRenewalRecord
2. Add html2canvas to frontend/package.json
3. Update PrintInvoice.tsx: fix PDF thermal size, fix share as image
4. Update Renewals.tsx: add History tab using getAllRenewalHistory
5. Update CustomerDetail.tsx: add delete/edit buttons to renewal history rows, add EditRenewalModal
6. Fix CustomerForm connection issue with proper loading state and error handling
