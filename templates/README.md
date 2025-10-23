# Templates

This directory contains testable project templates for each supported framework.

## Why Templates?

Instead of maintaining templates as strings in `default-artifact-code.ts`, we keep them as **real, testable projects**. Benefits:

- ✅ **Test in real browsers** before deploying
- ✅ **Update dependencies** easily with `npm update`
- ✅ **IDE support** with autocompletion and type checking
- ✅ **Version control** for template changes
- ❌ **No token waste** - `node_modules/` and `package-lock.json` are excluded

## Structure

```
templates/
  ├── react/          # React + Vite template
  │   ├── src/
  │   ├── package.json
  │   └── ...
  ├── vue/            # Vue + Vite template
  │   ├── src/
  │   ├── package.json
  │   └── ...
  └── README.md       # This file
```

## Workflow

### 1. Extract existing template (first time only)

If you already have templates in `default-artifact-code.ts`:

```bash
npm run tsx utils/extract-template.ts react
npm run tsx utils/extract-template.ts vue
```

This creates testable projects from your existing templates.

### 2. Work on templates

```bash
cd templates/react
npm install
npm run dev
```

Make your changes, test them, update dependencies, etc.

### 3. Regenerate `default-artifact-code.ts`

When you're done:

```bash
cd ../..  # Back to project root
npm run build:templates
```

This converts your templates back to the format used by the AI.

### 4. Commit everything

```bash
git add templates/ utils/default-artifact-code.ts
git commit -m "Update React template"
```

The generated `default-artifact-code.ts` should be committed to git.

## Adding a new framework

1. Create directory:
```bash
mkdir templates/svelte
```

2. Add your project files

3. Regenerate:
```bash
npm run build:templates
```

## What gets included?

✅ **Included:**
- All source files (`.ts`, `.tsx`, `.vue`, etc.)
- Config files (`package.json`, `vite.config.ts`, etc.)
- HTML files
- CSS files
- Public assets

❌ **Excluded** (to save tokens):
- `node_modules/`
- `package-lock.json` (regenerated automatically)
- `.git/`
- `dist/`, `build/`, `.next/`, etc.
- `.env` files
- Hidden files (`.DS_Store`, etc.)

## Tips

### Keep templates minimal

Templates should be **starting points**, not full applications. Include:
- Essential configuration
- Basic setup
- Common dependencies
- Example component

### Update dependencies regularly

```bash
cd templates/react
npm update
npm run dev  # Test it works
cd ../..
npm run build:templates
```

### Test before regenerating

Always test your template works:
```bash
cd templates/react
npm install
npm run dev
```

Visit `http://localhost:5173` and verify it works.

## Troubleshooting

### "Templates directory not found"

Create at least one template directory:
```bash
mkdir -p templates/react
```

### "No files found in template"

Make sure your template has files. Extract from existing:
```bash
npm run tsx utils/extract-template.ts react
```

### Template exists but won't extract

Delete the existing directory first:
```bash
rm -rf templates/react
npm run tsx utils/extract-template.ts react
```

