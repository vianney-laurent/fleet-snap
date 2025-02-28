# 🚗 Fleet Snap — Application de gestion d'inventaire automobile

Fleet Snap est une application web permettant aux collaborateurs de concessions automobiles de réaliser rapidement des **inventaires de véhicules** en prenant simplement une photo de la plaque d'immatriculation ou du VIN.  
L'application gère la connexion des utilisateurs par concession et centralise les informations dans Airtable via un webhook Make.com.

---

## 📋 Fonctionnalités principales

### 🔑 Authentification
- Connexion via email et mot de passe.
- Authentification gérée par **Supabase Auth**.
- Chaque utilisateur est associé à une **concession** (stockée dans `user_metadata` de Supabase).

---

### 📸 Capture photo
- Page d'accueil où l'utilisateur peut :
    - Prendre ou téléverser une photo de la plaque ou du VIN.
    - Envoyer cette photo vers un **webhook Make.com**.
    - Les informations envoyées sont :
        - 📧 Email de l'utilisateur.
        - 🏢 Concession.
        - 🖼️ Fichier photo.
- Un design épuré et mobile-first adapté aux smartphones.

---

### 📜 Historique
- Page affichant la **liste des inventaires réalisés** par l'utilisateur connecté.
- Les données sont récupérées via une **API route** qui interroge Airtable.
- Filtrage automatique sur l'email de l'utilisateur connecté.

---

### 👤 Profil utilisateur
- Page permettant de mettre à jour :
    - **Nom** (stocké dans `user_metadata.name`).
    - **Concession** (stockée dans `user_metadata.concession`).
    - **Mot de passe**.
- Mise à jour sécurisée directement via **`supabase.auth.updateUser()`**.

---

### 🛠️ Admin (Back Office)
- Interface permettant à un administrateur de :
    - Créer de nouveaux utilisateurs.
    - Renseigner : email, mot de passe et concession.
- L’ajout d’utilisateurs se fait via une **API route sécurisée**, utilisant la **Service Role Key de Supabase** (jamais exposée au front).

---

## ⚙️ Technologies utilisées

| Outil | Usage |
|---|---|
| **Next.js** | Frontend complet (pages, API routes) |
| **TailwindCSS** | Styling responsive (mobile-first) |
| **Supabase** | Authentification des utilisateurs & gestion des métadonnées (nom, concession) |
| **Make.com** | Réception des données d’inventaire (webhook) et intégration avec Airtable |
| **Airtable** | Stockage de l’historique des inventaires |

---

## 🗂️ Arborescence simplifiée

```
/components
    Header.js          // Header responsive (menu burger + desktop)
    Layout.js          // Wrapper commun (optionnel)
/pages
    index.js           // Login
    inventory.js       // Capture de photo
    history.js         // Historique de l’utilisateur
    profile.js         // Mise à jour profil
    admin.js           // Création d’utilisateur
    api/
        createUser.js  // API sécurisée pour création d’utilisateurs
        history.js     // API qui récupère les inventaires depuis Airtable
/public
    logo.png           // Logo de la concession
/styles
    globals.css        // TailwindCSS
```

---

## 🔑 Variables d’environnement

Créer un fichier **`.env.local`** à la racine :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔗 Flux des données (du clic au stockage)

1. 📲 L’utilisateur se connecte (Supabase Auth).
2. 🏢 Son email et sa concession sont récupérés (`user_metadata`).
3. 📸 Il prend une photo.
4. 📊 Les données (photo, email, concession) sont envoyées vers le **webhook Make.com**.
5. 📑 Make.com enregistre la photo dans Google Drive (optionnel) et crée une ligne dans Airtable.
6. 📜 La page Historique interroge Airtable pour récupérer uniquement les inventaires de l’utilisateur connecté.

---

## 🚀 Commandes utiles

### Lancer le projet en local
```bash
npm run dev
```

### Construire le projet
```bash
npm run build
```

---

## ✅ To-Do & améliorations possibles

- 🔒 Ajouter une gestion de rôle pour sécuriser l’accès à la page Admin.
- 📂 Permettre la prévisualisation des photos avant envoi.
- 📢 Ajouter des notifications toast pour un retour visuel plus fluide.
- 📱 Prévoir un mode hors-ligne (mise en cache local temporaire).

---

## 📋 Exemple de données envoyées au webhook

```json
{
    "email": "collaborateur@concession.com",
    "concession": "GGP Auto",
    "photo": "fichier-binaire.jpg"
}
```

---

## 🛠️ Prérequis

- Node.js 18+
- Compte Supabase avec table `auth.users` (pas besoin de créer une table profils manuelle)
- Compte Make.com avec un webhook de réception
- Table Airtable avec structure adaptée

---

## 📃 Licence

Projet privé — Tous droits réservés.

