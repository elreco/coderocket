---
name: File Library Modal Feature
overview: ""
todos:
  - id: 378c64fd-d484-4bf6-9c7c-a8c871fd0819
    content: Test file library modal with premium user, pagination, file selection, and new uploads
    status: pending
---

# File Library Modal Feature

## Overview

Add a file library modal accessible from the "Files" button that shows all previously uploaded files for premium users, with pagination and the ability to upload new files or select existing ones.

## Implementation Steps

### 1. Create API Route for File Listing

Create `app/api/files/route.ts`:

- GET endpoint to list user files from Supabase storage bucket "images"
- Filter files by userId pattern in filename (`${timestamp}-${userId}-${index}${extension}`)
- Implement pagination (page, limit parameters)
- Return file metadata: path, publicUrl, type, mimeType, upload date (from filename timestamp)
- Verify premium subscription before allowing access
- Sort by upload date (newest first)

### 2. Create File Library Modal Component

Create `components/file-library-modal.tsx`:

- Use Dialog component from `components/ui/dialog.tsx`
- Display grid/list of files with thumbnails for images, icons for PDFs
- Show file name, type, and upload date
- Implement pagination controls (Previous/Next buttons, page indicator)
- Add upload area within modal for new file uploads
- Add "Select" button on each file to add to current selection
- Show loading states and empty states
- Premium check with upgrade prompt if not premium

### 3. Update ImageUploadArea Component

Modify `components/image-upload-area.tsx`:

- Add state to control modal open/close
- Add button/icon to open file library (e.g., folder icon next to upload button)
- Pass `onFileSelect` callback to handle file selection from library
- Ensure modal only opens for premium users

### 4. Update Component Sidebar

Modify `app/(default)/components/[slug]/component-sidebar.tsx`:

- Handle file selection from library modal
- Convert selected library files to File objects or file info objects
- Add selected files to current `files` state
- Ensure compatibility with existing file upload flow

### 5. File Selection Logic

- When user selects a file from library, fetch file from storage
- Create file info object compatible with existing `UploadedFileInfo` interface
- Add to current files list (respecting `maxImagesUpload` limit)
- Show toast notification on successful selection

## Files to Create/Modify

**New Files:**

- `app/api/files/route.ts` - API endpoint for listing files with pagination
- `components/file-library-modal.tsx` - Modal component for file library

**Modified Files:**

- `components/image-upload-area.tsx` - Add library button and modal integration
- `app/(default)/components/[slug]/component-sidebar.tsx` - Handle file selection from library

## Technical Details

- **Pagination**: Use offset-based pagination (page * limit)
- **File Filtering**: Parse filenames to extract userId and filter accordingly
- **Premium Check**: Use existing subscription check pattern from `getSubscription()`
- **File Types**: Support images (png, jpg, jpeg, gif, webp) and PDFs
- **Storage**: Files stored in Supabase "images" bucket
- **UI**: Use existing Dialog, Button, AlertDialog (for delete confirmation), and other UI components for consistency