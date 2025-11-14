# File Locking Feature

## Overview

The file locking feature allows you to protect specific files or entire folders from AI modifications during code generation. This is useful when you have finalized certain parts of your code and want to prevent the AI from accidentally modifying them.

## How It Works

### Locking Individual Files

1. **Hover** over any file in the file tree
2. A lock icon (🔓) will appear on the right side
3. **Click** the lock icon to lock the file
4. A locked file displays a blue lock icon (🔒)
5. Click again to unlock

### Locking Folders

1. **Hover** over any folder in the file tree
2. A lock icon (🔓) will appear on the right side
3. **Click** the lock icon to lock **all files** in that folder and its subfolders
4. Click again to unlock all files in that folder

### Visual Indicators

- **Unlocked file/folder**: Gray unlock icon (🔓) appears on hover
- **Locked file/folder**: Blue lock icon (🔒) visible on hover

## AI Behavior

When files are locked:

- The AI **cannot modify** locked files
- The AI **cannot delete** locked files
- The AI **will not include** locked files in its generated code
- If you request changes that require modifying a locked file, the AI will explain that the file is locked and suggest unlocking it first

## Technical Implementation

### Storage

The locked state is persisted in your artifact code using a `locked="true"` attribute on the `<coderocketFile>` tag:

```xml
<coderocketFile name="src/components/Header.tsx" locked="true">
  // Your code here
</coderocketFile>
```

### System Prompt

The AI system prompt includes specific instructions about locked files:

```
LOCKED FILES PROTECTION:
- Some files may have a locked="true" attribute in their <coderocketFile> tags
- NEVER modify, delete, or include locked files in your artifact
- Locked files are protected by the user and should remain unchanged
```

## Use Cases

### 1. Protecting Configuration Files

Lock configuration files that you've finalized (e.g., `package.json`, `tsconfig.json`) to prevent accidental modifications.

### 2. Preserving Custom Logic

Lock files containing complex custom logic that you don't want the AI to alter.

### 3. Design System Components

Lock your design system components to ensure consistency across your application.

### 4. Third-Party Integrations

Lock files containing third-party API integrations or authentication logic.

### 5. Iterative Development

Lock completed features while iterating on new ones, ensuring the AI only modifies the areas you're actively working on.

## Best Practices

1. **Lock Incrementally**: Only lock files when you're confident they're complete
2. **Use Folder Locking**: Lock entire folders (like `/config` or `/utils`) for efficiency
3. **Document Locked Files**: Consider adding comments explaining why certain files are locked
4. **Review Before Locking**: Ensure files are thoroughly tested before locking them
5. **Temporary Unlocking**: Unlock files when you need the AI to make changes, then re-lock afterwards

## Keyboard Shortcuts

Currently, file locking is only available through the UI. Keyboard shortcuts may be added in future updates.

## Limitations

- Locked files will not be automatically updated if you change the framework or make major refactors
- If a locked file depends on unlocked files that get modified, you may need to manually update the locked file to maintain compatibility
- The AI can still reference locked files for context when generating other code

## Troubleshooting

### File Not Locking

- Ensure you're clicking the lock icon, not the file name
- Check that you're not in loading/generation mode
- Refresh the page if the issue persists

### AI Still Modifying Locked Files

- Verify the lock icon is blue (🔒) indicating the file is locked
- Check your artifact code for the `locked="true"` attribute
- If the issue persists, try unlocking and re-locking the file

### Locked Files Causing Errors

- Review dependencies between locked and unlocked files
- Temporarily unlock files if you need the AI to fix integration issues
- Manually update locked files if their dependencies have changed

## Future Enhancements

Planned improvements to the file locking feature:

- Bulk lock/unlock operations
- Lock templates for common patterns
- Visual indicators in the code preview
- Locked file history and audit log
- Keyboard shortcuts for quick locking
- Lock rules based on file patterns (e.g., `*.config.js`)



