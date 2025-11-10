# RShield — Panel Admin / AntiCheat + Système de Licences

**RShield** est un panel d'administration complet pour serveurs Roblox avec système de licences Firebase, anti-cheat, gestion des bans, et intégration en temps réel.

## 🎯 Fonctionnalités

- ✅ **Authentification Firebase** (email/mot de passe)
- ✅ **Système de Licences** (activation de clés, partage, révocation)
- ✅ **Vérification en temps réel** (Firestore listeners)
- ✅ **Console d'Administration** (commandes, annonces, bans)
- ✅ **Logs & Audit** (pagination, filtres)
- ✅ **Intégration Roblox** (script serveur complet)
- ✅ **Dashboard** (statistiques, serveurs actifs, joueurs en ligne)
- ✅ **Gestion des Utilisateurs** (rôles admin/moderator/user)

## 📋 Architecture

```
├── client/                 # Frontend React/TypeScript
│   ├── pages/             # Pages (Index, Dashboard, Activate, Admin)
│   ├── components/        # Composants UI réutilisables
│   ├── hooks/             # Hooks personnalisés (useActiveLicense, etc.)
│   └── lib/               # Firebase config, utilitaires
├── server/                # Backend Express.js
│   ├── routes/            # Routes API (rshield.ts)
│   ├── firebase-admin.ts  # Firebase Admin SDK init
│   └── index.ts           # Entry point serveur
├── public/
│   ├── scripts/roblox/    # Script Roblox TerminalSecureRShield.lua
│   └── assets/            # Logo, icônes
└── README.md              # This file
```

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js 18+**
- **Firebase Project** (avec Firestore, Auth activés)
- **npm** ou **pnpm**

### 1. Installation Locale

```bash
# Cloner le projet (ou depuis Builder.io)
git clone <repo-url>
cd rshield

# Installer les dépendances
npm install
# ou
pnpm install
```

### 2. Configuration Firebase

#### Créer un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Créer un nouveau projet
3. Activer **Firestore Database**
4. Activer **Firebase Authentication** (email/password)

#### Obtenir les Credentials

**Configuration Web** (client-side):

1. Aller à **Project Settings** → **Onglet "Général"**
2. Copier la `firebaseConfig` (déjà dans `client/lib/firebase.ts`)

**Service Account** (server-side):

1. Aller à **Project Settings** → **Onglet "Comptes de Service"**
2. Cliquer **"Générer une nouvelle clé privée"**
3. Copier le JSON entier

### 3. Configurer les Variables d'Environnement

#### .env (client - optionnel pour dev)

```bash
VITE_PUBLIC_BUILDER_KEY=your_builder_key_here
```

#### Définir FIREBASE_SERVICE_ACCOUNT_JSON

Utiliser **DevServerControl** (Builder.io UI) ou exporter manuellement:

```bash
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

Ou créer un fichier `.env.local` (non commité):

```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

### 4. Lancer en Développement

```bash
npm run dev
# Le serveur tourne sur http://localhost:8080/
```

Accédez à **http://localhost:8080** dans votre navigateur.

### 5. Créer les Collections Firestore

Les collections se créent automatiquement à la première utilisation. Vous pouvez les initialiser manuellement:

**Collections requises:**

- `users` — Documents utilisateur (email, role, robloxUserId)
- `licenses` — Clés de licence (key, ownerUid, active, createdAt)
- `servers` — Serveurs Roblox (serverId, stats, lastSeen)
- `logs` — Logs agrégés (level, message, at)
- `bans` — Bans de joueurs (robloxUserId, reason, active)
- `commands` — Commandes globales (target, action, executed)

### 6. Créer un Admin

**Depuis le Console de Firestore:**

1. Aller à **Firestore Database**
2. Créer une collection `users`
3. Ajouter un document avec votre `uid` Firebase et:

```json
{
  "role": "admin",
  "email": "your@email.com"
}
```

**Accès Admin (UI):**

- Cliquer sur **"Admin"** en bas du formulaire de connexion
- Utiliser: `admin` / `Antoine80@`

## 🎮 Intégration Roblox

### Installation du Script

1. **Télécharger** `public/scripts/roblox/TerminalSecureRShield.lua`
2. **Ouvrir Studio**, aller dans **ServerScriptService**
3. **Importer** le script (nouveau Script → Copier le contenu)
4. **Remplacer** `API_URL` par votre backend:

```lua
local API_URL = "https://your-deployed-backend.com"
```

5. **Sauvegarder** et tester

### Configuration du Script

En haut du script, personnaliser:

```lua
local REQUIRED_LICENSE = true  -- Demander une licence pour jouer
local POLL_INTERVAL = 5         -- Fréquence de vérification des commandes (secondes)
local STATS_INTERVAL = 30       -- Fréquence d'envoi des stats (secondes)
local LOG_EVENTS = true         -- Envoyer les logs au panel
```

### Fonctionnalités du Script Roblox

Le script gère automatiquement:

- ✅ **Enregistrement du serveur** au démarrage
- ✅ **Vérification des bans** lors de la connexion
- ✅ **Vérification des licences** (si activée)
- ✅ **Envoi des stats** (joueurs, serveur)
- ✅ **Écoute des commandes** (bans, kicks, annonces)
- ✅ **Logs** en temps réel vers le panel

### Commandes Disponibles (Panel → Roblox)

- `announce <message>` — Annonce globale
- `kick <playerUserId>` — Expulse un joueur
- `ban <playerUserId> <reason>` — Bannit un joueur
- `restart` — Redémarre le serveur

## 📦 Déploiement

### Option 1: Render.com (Recommandé)

1. **Push** ton code sur GitHub
2. Créer un compte [Render](https://render.com)
3. **New → Web Service** → Connecter ton repo
4. **Build Command**: `npm install`
5. **Start Command**: `npm run dev`
6. Ajouter les **Environment Variables**:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (service account JSON entier)
   - `NODE_ENV=production`
7. **Deploy**

### Option 2: Vercel (Frontend Statique)

1. Deploy le frontend sur [Vercel](https://vercel.com)
2. Déployer le backend séparément (Render, Railway, etc.)

### Option 3: Railway.app

Similaire à Render:

1. Créer un projet Railway
2. Connecter GitHub
3. Ajouter `FIREBASE_SERVICE_ACCOUNT_JSON` en secret
4. Deploy

## 🔐 Sécurité Firestore

Voici des **règles de sécurité** recommandées pour Firestore:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: read own, admins can read all
    match /users/{uid} {
      allow read: if request.auth.uid == uid || isAdmin();
      allow write: if request.auth.uid == uid;
    }

    // Licenses: read own, admins can modify
    match /licenses/{key} {
      allow read: if request.auth.uid == resource.data.ownerUid || isAdmin();
      allow create: if isAdmin();
      allow update: if isAdmin() || request.auth.uid == resource.data.ownerUid;
    }

    // Logs: read for admins only
    match /logs/{doc=**} {
      allow read: if isAdmin();
      allow create: if true; // Roblox servers can log
    }

    // Bans: read public, write admin only
    match /bans/{doc=**} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Servers: read public, write self
    match /servers/{serverId} {
      allow read: if true;
      allow write: if true; // For now, restrict later
    }

    // Commands: read/write admin
    match /commands/{doc=**} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Helper function
    function isAdmin() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
  }
}
```

## 📝 API Endpoints

### Authentification & Licences

```
POST   /api/admin/verify
       { name: string, password: string }

POST   /api/license/activate
       { key: string }
       Headers: Authorization: Bearer {idToken}

POST   /api/license/createKey
       { key?: string }
       Headers: Authorization: Bearer {idToken}
       (Admin only)

GET    /api/license/check
       ?robloxId={userId}
```

### Serveurs & Logs

```
POST   /api/server/register
       { serverId: string }

POST   /api/server/stats
       { serverId: string, stats: object }

GET    /api/command
       ?serverId={serverId}

POST   /api/command/:id/execute

POST   /api/log
       { level: string, message: string, serverId?: string, meta?: object }
```

### Bans

```
GET    /api/bans
       ?userId={robloxUserId}

POST   /api/ban
       { robloxUserId: string, reason: string }
       Headers: Authorization: Bearer {idToken}
       (Moderator+)

POST   /api/unban
       { robloxUserId: string }
       Headers: Authorization: Bearer {idToken}
       (Moderator+)
```

## 🛠️ Développement

### Structure des Pages

- **Index.tsx**: Login/Register multi-step
- **Activate.tsx**: Activation de licence (obligatoire)
- **Dashboard.tsx**: Panel principal avec stats en temps réel
- **Admin.tsx**: Panel admin (création de clés, etc.)

### Composants Dashboard

- `StatsOverview`: Stats temps réel (Firestore listeners)
- `Console`: Terminal pour commandes
- `LogsViewer`: Visualisation des logs avec filtres

### Hooks Personnalisés

- `useActiveLicense(user)`: Vérifie si l'utilisateur a une licence active

## 🐛 Troubleshooting

### "Firebase Service Account not configured"

→ Définir `FIREBASE_SERVICE_ACCOUNT_JSON` en variable d'environnement

### "License not found"

→ Créer une licence dans Firestore (`/licenses/{key}`)
→ Utiliser le panel admin pour créer des clés

### Serveur Roblox ne se connecte pas

→ Vérifier que `API_URL` pointe vers le bon backend
→ Vérifier CORS dans le backend (déjà configuré)
→ Tester avec `curl`:

```bash
curl -X POST http://localhost:8080/api/server/register \
  -H "Content-Type: application/json" \
  -d '{"serverId":"test-server"}'
```

### Firestore Quota dépassée

→ Réduire `POLL_INTERVAL` et `STATS_INTERVAL` dans le script Roblox
→ Implémenter des listeners uniquement pour les données nécessaires

## 📚 Documentation Complète

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Real-time Listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Roblox API Reference](https://developer.roblox.com/en-us/api-reference)

## 🤝 Contribuer

Les pull requests sont bienvenues. Pour les changements majeurs:

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une PR

## 📄 License

Ce projet est sous **MIT License**.

## ⚖️ Politique de Confidentialité & Conformité

- **Pas de collecte PII inutile** — Seulement email et Roblox ID
- **Droit à l'oubli** — Les utilisateurs peuvent demander la suppression
- **Audit trail** — Tous les bans et actions admin sont loggés
- **Reversibilité** — Les bans peuvent être révoqués par un admin

---

**Questions?** Ouvrir une issue ou contacter l'équipe RShield.

Bonne gestion! 🚀
