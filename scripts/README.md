# Scripts de gestion des templates

Ce dossier contient les scripts pour gérer les templates de CodeRocket.

## 📝 Scripts disponibles

### `build-templates.js`

Convertit les projets dans `templates/` en format `<coderocketArtifact>` pour l'IA.

```bash
npm run build:templates
```

**Génère :** `utils/default-artifact-code.ts`

**Exclut automatiquement :**
- `node_modules/`
- `package-lock.json`
- `dist/`, `build/`, `.next/`
- `.git/`, `.env`

### `watch-templates.js`

Watch les templates et rebuild automatiquement quand ils changent.

```bash
npm run watch:templates
```

**Utilisation :**
- Lance dans un terminal séparé pendant le développement
- Détecte les changements dans `templates/`
- Rebuild automatiquement après 500ms

### `check-templates.js`

Vérifie que `default-artifact-code.ts` est à jour avec les templates.

```bash
npm run check:templates
```

**Utilisé par :**
- Pre-commit hook git (automatique)
- CI/CD (optionnel)

**Résultat :**
- ✅ Exit 0 si à jour
- ❌ Exit 1 si désynchronisé

### `extract-template.js`

Extrait un template depuis `default-artifact-code.ts` vers un projet testable.

```bash
npm run extract:template react
npm run extract:template vue
```

**Crée :**
- `templates/<framework>/` avec tous les fichiers
- Structure de projet complète et testable

## 🔒 Protection Git Hook

Le pre-commit hook (`simple-git-hooks`) appelle automatiquement `check-templates.js`.

**Configuration dans `package.json` :**

```json
{
  "simple-git-hooks": {
    "pre-commit": "node scripts/check-templates.js"
  }
}
```

**Installation :**

```bash
npm install  # Installe le hook automatiquement
```

## 🛠️ Workflow de développement

### Option 1 : Avec watcher (recommandé)

```bash
# Terminal 1
npm run watch:templates

# Terminal 2
cd templates/react
# Modifie des fichiers...
# Le watcher rebuild automatiquement !

# Commit
git add .
git commit -m "Update template"  # Hook vérifie automatiquement
```

### Option 2 : Manuel

```bash
cd templates/react
# Modifie des fichiers...

cd ../..
npm run build:templates

git add .
git commit -m "Update template"
```

## ⚙️ Détails techniques

### Format de sortie

Les scripts génèrent du code TypeScript :

```typescript
export const defaultArtifactCode = {
  html: ``,
  react: `<coderocketArtifact ...>...</coderocketArtifact>`,
  vue: `<coderocketArtifact ...>...</coderocketArtifact>`,
};
```

### Patterns d'exclusion

Définis dans chaque script :

```javascript
const IGNORED_PATTERNS = [
  "node_modules",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".git",
  ".DS_Store",
  "dist",
  ".vite",
  ".turbo",
  "build",
  ".next",
  ".cache",
  "coverage",
  ".env",
  ".env.local",
  ".gitignore",
];
```

### Debouncing dans le watcher

Le watcher attend 500ms après le dernier changement avant de rebuild :

```javascript
function debouncedBuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(buildTemplates, 500);
}
```

Cela évite de rebuild à chaque frappe pendant l'édition.

## 🐛 Troubleshooting

### Le watcher ne détecte pas les changements

- Vérifie que tu n'es pas dans `node_modules/`
- Relance avec `npm run watch:templates`

### Le hook ne se déclenche pas

```bash
# Réinstalle le hook
npm run postinstall
```

### Le check échoue mais les templates sont à jour

```bash
# Force rebuild
npm run build:templates
git add utils/default-artifact-code.ts
```

### "Templates directory not found"

```bash
# Crée au moins un template
npm run extract:template react
```

## 📚 Voir aussi

- [`TEMPLATES.md`](../TEMPLATES.md) - Documentation complète du système
- [`templates/README.md`](../templates/README.md) - Guide des templates

