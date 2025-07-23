# GitHub Sync - Guide d'utilisation

Ce guide explique comment utiliser la fonctionnalité de synchronisation GitHub pour vos composants CodeRocket.

## Prérequis

1. **Compte GitHub connecté** : Connectez votre compte GitHub dans les paramètres de votre compte
2. **Composant généré** : Avoir au moins un composant avec du code généré

## Étapes pour synchroniser un composant

### 1. Accéder aux paramètres du composant

- Ouvrez votre composant dans CodeRocket
- Cliquez sur l'icône **Settings** (⚙️) dans la barre d'outils
- Une sidebar s'ouvre avec les paramètres

### 2. Section GitHub Sync

Dans les paramètres, vous trouverez une section **"GitHub Sync"** avec différents états :

#### État 1: GitHub non connecté
- **Message** : "GitHub not connected"
- **Action** : Cliquer sur "Go to Account Settings" pour connecter GitHub

#### État 2: Créer un repository
- **Interface** : Formulaire de création de repository
- **Nom du repo** : Pré-rempli avec `coderocket-{slug}`
- **Action** : Cliquer sur "Create GitHub Repository"

#### État 3: Repository connecté
- **Affichage** : Nom du repository + lien vers GitHub
- **Options** : Toggle pour activer/désactiver la sync + bouton de sync manuel

### 3. Créer le repository GitHub

Quand vous créez un repository :

1. **Repository créé automatiquement** sur votre compte GitHub
2. **Fichiers générés** :
   - Code du composant (ex: `src/App.jsx`)
   - `package.json` (pour React/Next.js)
   - `README.md` avec instructions
3. **Configuration** : Repository public par défaut avec gitignore Node.js

### 4. Synchronisation

Une fois le repository créé :

#### Activation de la sync
- **Toggle "Enable GitHub Sync"** : Active la synchronisation
- Quand activé, la section de sync manuelle apparaît

#### Sync manuelle
- **Bouton "Sync to GitHub"** : Pousse la version actuelle vers GitHub
- **Versioning** : Chaque sync inclut le numéro de version dans le commit
- **Fichiers** : Tous les fichiers du composant sont mis à jour

### 5. Gestion des versions

- **Version sélectionnée** : La sync pousse la version actuellement sélectionnée
- **Messages de commit** : `Update {nom-fichier} - Version {numéro}`
- **Historique** : Chaque version crée un commit séparé

## Structure des fichiers GitHub

### Pour les composants HTML
```
repository/
├── index.html          # Code HTML du composant
└── README.md           # Documentation
```

### Pour les composants React/Next.js
```
repository/
├── src/
│   └── App.jsx         # Code React du composant
├── package.json        # Dépendances et scripts
└── README.md           # Documentation
```

## Workflow recommandé

1. **Créer** votre composant sur CodeRocket
2. **Tester** et itérer jusqu'à satisfaction
3. **Connecter GitHub** dans les paramètres compte
4. **Créer repository** depuis les settings du composant
5. **Activer la sync** pour synchroniser automatiquement
6. **Développer localement** :
   ```bash
   git clone https://github.com/username/repo-name
   cd repo-name
   npm install
   npm start
   ```

## Avantages de la synchronisation

### ✅ **Collaboration**
- Partager le code avec votre équipe
- Contributions via Pull Requests
- Historique des modifications

### ✅ **Développement local**
- Éditer avec votre IDE favori
- Utiliser vos outils de développement
- Tests et debugging avancés

### ✅ **Version control**
- Historique complet des versions
- Branches pour différentes features
- Rollback facile

### ✅ **Déploiement**
- Déployer via GitHub Pages
- CI/CD avec GitHub Actions
- Intégration avec Vercel, Netlify, etc.

## Limitations

- **Sync unidirectionnelle** : Web → GitHub uniquement (pour l'instant)
- **Repository public** : Créés en public par défaut
- **Un repo par composant** : Chaque composant = un repository

## Troubleshooting

### Erreur "Repository already exists"
- Le nom du repository existe déjà sur votre compte
- Changer le nom ou supprimer l'ancien repository

### Erreur "GitHub not connected"
- Aller dans Account Settings
- Reconnecter GitHub si nécessaire

### Erreur de sync
- Vérifier les permissions GitHub
- Réessayer la synchronisation
- Contacter le support si le problème persiste

## Support

Pour toute question ou problème :
- Documentation complète : [docs/github-integration.md](./github-integration.md)
- Contact support : support@coderocket.app