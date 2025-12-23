---
name: Code Audit Refactoring
overview: "Audit complet identifiant 3 \"monster files\" majeurs a refactoriser : component-sidebar.tsx (1558 lignes), route.ts (2089 lignes), et completion-parser.ts (1421 lignes), plus des opportunites d'amelioration transversales."
todos:
  - id: backend-validation
    content: Extraire validation.ts depuis route.ts - validation user, limites d'utilisation, prompt
    status: completed
  - id: backend-website-clone
    content: Extraire website-clone.ts - logique de clonage de site web
    status: completed
  - id: backend-message-builder
    content: Extraire message-builder.ts - construction des messages pour l'IA
    status: completed
  - id: backend-post-processing
    content: Extraire post-processing.ts - actions apres completion
    status: completed
  - id: frontend-sidebar-hooks
    content: Creer hooks pour component-sidebar (useSidebarState, useFileUpload, useChatInput)
    status: completed
  - id: frontend-sidebar-components
    content: Extraire composants sidebar (ChatTab, HistoryTab, ChatInputForm)
    status: completed
  - id: utils-completion-parser
    content: Diviser completion-parser.ts en modules (artifact-parser, file-parser, content-parser)
    status: completed
---

# Audit et Plan de Refactoring

## 1. Frontend - component-sidebar.tsx (1558 lignes) - PRIORITE HAUTE

Meme probleme que `component-completion.tsx` avant refacto.

### Problemes identifies

- 15+ useState declares au debut du composant
- Rendu conditionnel complexe pour 6 onglets differents (chat, history, github, integrations, deployment, settings)
- Logique de validation de fichiers, paste handling, scraping melangee avec le rendu
- Le JSX fait 1000+ lignes avec beaucoup de repetition

### Solution proposee

**Hooks a extraire:**

- `useSidebarState` - etats principaux (activeTab, hasImproved, isImprovingLoading, etc.)
- `useFileUpload` - logique d'upload et paste (handleFileChange, handlePaste)
- `useChatInput` - logique du textarea (validation, improve prompt)

**Composants a extraire:**

- `ChatTab` - onglet chat avec le formulaire
- `HistoryTab` - liste des versions
- `SidebarTabs` - navigation entre onglets
- `ChatInputForm` - formulaire d'input avec boutons

### Structure cible

```javascript
component-sidebar/
├── component-sidebar.tsx (~400 lignes)
├── hooks/
│   ├── use-sidebar-state.ts
│   ├── use-file-upload.ts
│   └── use-chat-input.ts
└── components/
    ├── chat-tab.tsx
    ├── history-tab.tsx
    ├── sidebar-tabs.tsx
    └── chat-input-form.tsx
```

---

## 2. Backend - app/api/components/route.ts (2089 lignes) - PRIORITE HAUTE

Le fichier API le plus critique, tres difficile a maintenir.

### Problemes identifies

**Fonction `validateRequest` (~600 lignes):**

- Validation utilisateur
- Gestion des limites d'utilisation (dupliquee pour subscription vs free)
- Clonage de site web (400+ lignes)
- Upload de fichiers
- Recuperation des messages

**Fonction `POST` (~500 lignes):**

- Parsing du FormData
- Construction des messages pour l'IA
- Streaming de la reponse
- Post-processing (screenshots, build, github sync)

**Duplication flagrante (lignes 1590-1652):**

```typescript
// Pour subscription
if (rocketsUsed >= limits.monthly_rockets) {
  if (extraMessages > 0) {
    const decremented = await decrementExtraMessagesCount(user.id);
    if (!decremented) throw new Error("limit-exceeded");
  } else {
    throw new Error("limit-exceeded");
  }
}

// Pour free (code quasi-identique)
if (rocketsUsed >= limits.monthly_rockets) {
  if (extraMessages > 0) {
    const decremented = await decrementExtraMessagesCount(user.id);
    if (!decremented) throw new Error("limit-exceeded");
  } else {
    throw new Error("limit-exceeded");
  }
}
```



### Solution proposee

**Fichiers a creer dans `app/api/components/`:**

1. **`validation.ts`** - Validation et verification des limites

- `validateUser()`
- `checkUsageLimits(userId, subscription)` - unifier la logique dupliquee
- `validatePromptLength()`

2. **`website-clone.ts`** - Logique de clonage de site

- `cloneWebsiteContent(url, framework)`
- `buildClonePrompt(cloneResult, framework)`
- `uploadCloneScreenshot(screenshot)`

3. **`message-builder.ts`** - Construction des messages pour l'IA

- `buildMessagesForAI(messages, prompt, files)`
- `buildFinalUserMessage(prompt, files)`
- `getMessageFiles(message)`

4. **`post-processing.ts`** - Actions apres la completion

- `updateDataAfterCompletion()`
- `handleScreenshot()`
- `triggerBuildAndSync()`

5. **`file-handler.ts`** - Gestion des fichiers uploades

- `processUploadedFiles(files, libraryPaths)`
- `parseFileItems()`

### Structure cible

```javascript
app/api/components/
├── route.ts (~400 lignes - orchestration seulement)
├── validation.ts
├── website-clone.ts
├── message-builder.ts
├── post-processing.ts
└── file-handler.ts
```

---

## 3. Utils - completion-parser.ts (1421 lignes) - PRIORITE MOYENNE

### Problemes identifies

- Trop de responsabilites dans un seul fichier
- `getUpdatedArtifactCode` fait 350+ lignes avec logique complexe de merge
- Melange de parsing d'artifacts, fichiers, themes, markdown

### Solution proposee

**Diviser en fichiers specialises:**

1. **`artifact-parser.ts`** - Parsing des artifacts coderocket

- `getUpdatedArtifactCode()`
- `extractFilesFromArtifact()`
- `toggleFileLock()`

2. **`file-parser.ts`** - Extraction et categorisation des fichiers

- `extractFilesFromCompletion()`
- `extractDirectFiles()`
- `categorizeFiles()`
- `createContinuePrompt()`

3. **`content-parser.ts`** - Parsing du contenu (titre, theme, chunks)

- `extractTitle()`
- `extractDataTheme()`
- `parseContentChunks()`
- `ensureCDNsPresent()`

4. **`index.ts`** - Re-export pour compatibilite

### Structure cible

```javascript
utils/
├── completion-parser/
│   ├── index.ts (re-exports)
│   ├── artifact-parser.ts
│   ├── file-parser.ts
│   └── content-parser.ts
└── ...autres utils
```

---

## 4. Ameliorations transversales - PRIORITE BASSE

### Types partages

Creer `types/api.ts` pour les interfaces repetees:

- `UploadedFileInfo`
- `FileItem`
- `CloneResult`

### Context component-context.tsx

Le `ComponentContextType` a 60+ proprietes. Envisager de le diviser:

- `ChatContext` - messages, completion, input
- `PreviewContext` - breakpoint, previewPath, navigation
- `UIContext` - isLoading, isVisible, modals

### Actions files

Regrouper les server actions par domaine:

- `actions/chat-actions.ts`
- `actions/message-actions.ts`
- `actions/like-actions.ts`

---

## Ordre d'implementation recommande

1. **Phase 1 - Backend route.ts** (impact critique sur maintenabilite)

- Commencer par extraire `validation.ts` (le plus simple)
- Puis `website-clone.ts` (code isole)
- Puis `message-builder.ts` et `post-processing.ts`

2. **Phase 2 - Frontend component-sidebar.tsx**

- Meme approche que pour component-completion.tsx
- Hooks d'abord, puis composants

3. **Phase 3 - completion-parser.ts**

- Division en modules
- Garder les exports existants pour compatibilite

4. **Phase 4 - Ameliorations transversales**

- Types partages