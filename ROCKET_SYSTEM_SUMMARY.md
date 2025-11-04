# 🚀 Rocket System - Final Implementation

## Concept

**Rockets** sont l'unité de mesure principale pour l'usage de l'IA. Plus de "tokens" ou "crédits" visibles par l'utilisateur.

## Conversion

```
1 Rocket = 10,000 AI tokens
```

## Limites par Plan

### Free Plan
- **60 Rockets/mois** (~10-15 générations)
- Équivalent à 600K tokens

### Starter Plan
- **600 Rockets/mois** (~100-150 générations)
- Équivalent à 6M tokens

### Pro Plan
- **1,800 Rockets/mois** (~300-400 générations)
- Équivalent à 18M tokens

## Achat de Rockets Supplémentaires

- **Prix**: $1 par Rocket
- **Valeur**: 10,000 tokens par Rocket
- **Utilisation**: Quand la limite mensuelle est atteinte
- **Expiration**: Jamais

## Interface Utilisateur

### Page Account
- **"🚀 Rockets used"**: 45 / 60
- **Barre de progression**: Affiche le % utilisé
- **"Extra Rockets"**: Badge vert pour les Rockets achetés
- **"Total spent this month"**: Coût réel en USD

### Page Pricing
- **Free**: "60 🚀 Rockets per month (~10-15 generations)"
- **Starter**: "600 🚀 Rockets per month (~100-150 generations)"
- **Pro**: "1,800 🚀 Rockets per month (~300-400 generations)"

### Achat
- **Titre**: "🚀 Buy Rockets"
- **Description**: "Each Rocket = 10,000 AI tokens"
- **Prix**: "$5.00 for 5 🚀 Rockets"

## Logique Technique

### Backend
1. Calcul des tokens utilisés (input + output)
2. Conversion en Rockets: `tokens / 10,000`
3. Comparaison avec la limite du plan
4. Si limite atteinte + Rockets extras disponibles → utilise 1 Rocket
5. Si limite atteinte + pas de Rockets → bloqué

### Fichiers Créés/Modifiés
- `utils/rocket-conversion.ts` - Nouvelle logique de conversion
- `app/(default)/account/page.tsx` - Affichage en Rockets
- `app/(default)/account/components/buy-extra-messages.tsx` - Achat de Rockets
- `app/(default)/pricing/pricing.tsx` - Limites en Rockets
- `app/api/components/route.ts` - Vérification des limites en Rockets

## Avantages

1. **Simple pour l'utilisateur**: Une seule unité (Rockets) au lieu de tokens techniques
2. **Marketing-friendly**: "🚀 Rockets" est plus vendeur que "tokens"
3. **Flexible**: Facile d'ajuster la conversion (actuellement 1 Rocket = 10K tokens)
4. **Transparent**: L'utilisateur voit exactement combien de Rockets il a utilisé
5. **Pas de hard limit**: Peut toujours acheter des Rockets supplémentaires

## Calcul de Rentabilité

Avec 1 Rocket = 10K tokens et $1 par Rocket:
- **Coût pour l'utilisateur**: $1 pour 10K tokens
- **Coût réel moyen** (avec marge 50%): ~$0.60 pour 10K tokens
- **Marge**: ~40% (rentable ✅)

Exemple génération typique:
- 50K tokens (input + output) = 5 Rockets
- Si acheté: $5
- Coût réel: ~$3
- Profit: $2 (40% de marge)

