# GitHub Sync - Usage Guide

This guide explains how to use the GitHub synchronization feature for your CodeRocket components.

## Prerequisites

1. **Connected GitHub Account**: Connect your GitHub account in your account settings
2. **Generated Component**: Have at least one component with generated code

## Steps to Sync a Component

### 1. Access Component Settings

- Open your component in CodeRocket
- Click the **Settings** icon (⚙️) in the toolbar
- A sidebar opens with settings

### 2. GitHub Sync Section

In settings, you'll find a **"GitHub Sync"** section with different states:

#### State 1: GitHub Not Connected
- **Message**: "GitHub not connected"
- **Action**: Click "Go to Account Settings" to connect GitHub

#### State 2: Create Repository
- **Interface**: Repository creation form
- **Repo Name**: Pre-filled with `coderocket-{slug}`
- **Action**: Click "Create GitHub Repository"

#### State 3: Repository Connected
- **Display**: Repository name + link to GitHub
- **Options**: Toggle to enable/disable sync + manual sync button

### 3. Create GitHub Repository

When you create a repository:

1. **Repository automatically created** on your GitHub account
2. **Generated files**:
   - Component code (e.g., `src/App.jsx`)
   - `package.json` (for React/Next.js)
   - `README.md` with instructions
3. **Configuration**: Public repository by default with Node.js gitignore

### 4. Synchronization

Once the repository is created:

#### Sync Activation
- **Toggle "Enable GitHub Sync"**: Activates synchronization
- When enabled, the manual sync section appears

#### Manual Sync
- **"Sync to GitHub" Button**: Pushes current version to GitHub
- **Versioning**: Each sync includes version number in commit
- **Files**: All component files are updated

### 5. Version Management

- **Selected Version**: Sync pushes the currently selected version
- **Commit Messages**: `Update {filename} - Version {number}`
- **History**: Each version creates a separate commit

## GitHub File Structure

### For HTML Components
```
repository/
├── index.html          # Component HTML code
└── README.md           # Documentation
```

### For React Components
```
repository/
├── src/
│   └── App.tsx         # Component React code
├── package.json        # Dependencies and scripts
└── README.md           # Documentation
```

### For Vue.js Components
```
repository/
├── src/
│   └── App.vue         # Component Vue code
├── package.json        # Dependencies and scripts
└── README.md           # Documentation
```

## Recommended Workflow

1. **Create** your component on CodeRocket
2. **Test** and iterate until satisfied
3. **Connect GitHub** in account settings
4. **Create repository** from component settings
5. **Enable sync** to automatically synchronize
6. **Develop locally**:
   ```bash
   git clone https://github.com/username/repo-name
   cd repo-name
   npm install
   npm start
   ```

## Synchronization Benefits

### ✅ **Collaboration**
- Share code with your team
- Contributions via Pull Requests
- Modification history

### ✅ **Local Development**
- Edit with your favorite IDE
- Use your development tools
- Advanced testing and debugging

### ✅ **Version Control**
- Complete version history
- Branches for different features
- Easy rollback

### ✅ **Deployment**
- Deploy via GitHub Pages
- CI/CD with GitHub Actions
- Integration with Vercel, Netlify, etc.

## Limitations

- **Unidirectional sync**: Web → GitHub only (for now)
- **Public repository**: Created as public by default
- **One repo per component**: Each component = one repository

## Troubleshooting

### "Repository already exists" Error
- Repository name already exists on your account
- Change the name or delete the old repository

### "GitHub not connected" Error
- Go to Account Settings
- Reconnect GitHub if necessary

### Sync Error
- Check GitHub permissions
- Retry synchronization
- Contact support if problem persists

## Support

For any questions or issues:
- Complete documentation: [docs/github-integration.md](./github-integration.md)
- Support contact: support@coderocket.app