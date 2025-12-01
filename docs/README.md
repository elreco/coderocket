# CodeRocket Documentation

This is the documentation site for CodeRocket, built with [Mintlify](https://mintlify.com).

## 🚀 Quick Start

### Local Development

1. Install the latest Mintlify CLI:
```bash
npm i mintlify@latest -g
```

2. Preview the documentation:
```bash
mintlify dev
```

The documentation will be available at `http://localhost:3000`.

### Migration from mint.json to docs.json

This documentation uses the new `docs.json` format introduced by Mintlify in February 2025. The new format provides:
- Integrated navigation structure (no separate tabs/anchors arrays)
- Better organization with tabs → groups → pages hierarchy
- More flexibility in file organization across folders

For more details, see [Mintlify's migration guide](https://mintlify.com/blog/refactoring-mint-json-into-docs-json).

### Deployment

This documentation is automatically deployed when changes are pushed to the main branch.

## 📁 Structure

```
docs/
├── docs.json              # Mintlify configuration (new format)
├── introduction.mdx       # Homepage
├── quickstart.mdx         # Getting started guide
├── file-locking.md       # File locking feature guide
├── github/               # GitHub integration docs
│   ├── overview.mdx      # Feature overview
│   ├── setup.mdx         # Setup instructions
│   ├── synchronization.mdx # Sync guide
│   └── troubleshooting.mdx # Common issues
```

## ✏️ Writing Documentation

### MDX Format
All documentation files use MDX format, which allows you to:
- Write Markdown content
- Use React components
- Include interactive elements

### Mintlify Components
Available components include:
- `<Card>` - Feature cards and links
- `<CardGroup>` - Group multiple cards
- `<Tabs>` - Tabbed content
- `<Steps>` - Step-by-step guides
- `<Accordion>` - Collapsible sections
- `<Warning>`, `<Info>`, `<Tip>` - Callouts
- `<Check>` - Checkmarks and lists

### Example Usage

```mdx
---
title: 'Page Title'
description: 'Page description for SEO'
---

## Section Title

<CardGroup cols={2}>
  <Card title="Feature 1" icon="star">
    Description of feature 1
  </Card>
  <Card title="Feature 2" icon="heart">
    Description of feature 2
  </Card>
</CardGroup>

<Steps>
  <Step title="First Step">
    Instructions for the first step
  </Step>
  <Step title="Second Step">
    Instructions for the second step
  </Step>
</Steps>
```

## 🔧 Configuration

The `docs.json` file contains:
- Site configuration
- Integrated navigation structure (tabs, groups, pages)
- Styling options
- Component settings

## 📸 Images and Assets

Place images in a `public/images/` directory and reference them as:
```mdx
<img src="/images/screenshot.png" alt="Description" />
```

## 🎨 Customization

### Colors
Update the color scheme in `docs.json`:
```json
"colors": {
  "primary": "#2563eb",
  "light": "#3b82f6",
  "dark": "#1d4ed8"
}
```

### Navigation
Modify the navigation structure using the new integrated format:
```json
"navigation": {
  "tabs": [
    {
      "tab": "Getting Started",
      "groups": [
        {
          "group": "Overview",
          "pages": ["introduction", "quickstart"]
        }
      ]
    }
  ]
}
```

## 📝 Content Guidelines

### Writing Style
- Use clear, concise language
- Include practical examples
- Provide step-by-step instructions
- Use screenshots for complex UI interactions

### Code Examples
- Include runnable code samples
- Show both input and expected output
- Explain complex concepts with comments

### Links
- Use descriptive link text
- Link to relevant sections within the docs
- Include external links where helpful

## 🚀 Features Covered

### GitHub Integration
Complete documentation for:
- ✅ Account connection setup
- ✅ Repository creation and management
- ✅ Bidirectional synchronization
- ✅ Conflict resolution strategies
- ✅ Troubleshooting common issues
- ✅ Best practices and workflows

### Templates
Complete documentation for:
- ✅ Templates overview and concepts
- ✅ Using free and premium templates
- ✅ Sharing templates with the community
- ✅ Customizing and modifying templates
- ✅ Best practices for template creation
- ✅ Pricing strategies for premium templates

### File Locking
Complete documentation for:
- ✅ Locking/unlocking individual files
- ✅ Locking/unlocking entire folders
- ✅ AI behavior with locked files
- ✅ Use cases and best practices
- ✅ Troubleshooting guide

### Future Sections
Planned documentation areas:
- API reference
- Component frameworks
- Advanced features
- Team management
- Billing and subscriptions

## 📞 Support

For documentation issues or suggestions:
- Join our Discord community
