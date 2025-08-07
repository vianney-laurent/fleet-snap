# 🚗 Fleet Snap — Application de gestion d’inventaire automobile

Fleet Snap est une application web mobile-first permettant aux collaborateurs de concessions automobiles de réaliser rapidement des inventaires de véhicules en photographiant la plaque d’immatriculation ou le VIN.  
Les utilisateurs se connectent via Supabase Auth, les zones sont gérées dans une table Supabase, et chaque inventaire est transmis à un webhook Make.com.

---

## 📋 Fonctionnalités principales

### 🔑 Authentification
- Connexion par email et mot de passe via **Supabase Auth**  
- Stockage du nom et de la concession de l’utilisateur dans `user_metadata`

### 🌍 Gestion des zones
- Liste des zones récupérée dynamiquement depuis la table `zones` de Supabase  
- Possibilité de créer de nouvelles zones directement depuis l’interface

### 📸 Capture et envoi d’inventaire
- Prise de photo ou téléversement d’une image de plaque/VIN  
- Saisie d’un commentaire optionnel  
- Envoi des données (photo + metadata utilisateur + zone + commentaire) au **WEBHOOK_URL** (Make.com)

### 📜 Historique
- Affichage de l’historique des inventaires de l’utilisateur connecté  
- Récupération via une API interne Next.js qui interroge Supabase

### 👤 Profil utilisateur
- Mise à jour du nom, de la concession et du mot de passe  
- Utilisation de `supabase.auth.updateUser()` pour les modifications

### 🛠️ Back-office (Admin)
- Création de nouveaux utilisateurs (email, mot de passe, concession)  
- Endpoint API sécurisé utilisant la **Service Role Key** de Supabase (côté serveur)

---

## ⚙️ Technologies

| Outil        | Usage                                               |
| ------------ | --------------------------------------------------- |
| Next.js      | Framework React + routes API                        |
| Tailwind CSS | Styling responsive mobile-first                     |
| Supabase     | Authentification & base de données Postgres         |
| Make.com     | Webhook pour traitement et stockage externe         |
| React Hooks  | `useState`, `useEffect` pour la gestion du state    |

---

## 🗂️ Structure du projet

```text
fleet-snap/
├─ components/
│  ├─ Header.js
│  └─ Layout.js
├─ pages/
│  ├─ index.js       # Page de connexion
│  ├─ inventory.js   # Capture et envoi de photo
│  ├─ history.js     # Historique des inventaires
│  ├─ profile.js     # Mise à jour du profil
│  ├─ admin.js       # Interface admin
│  └─ api/
│     ├─ createUser.js  # Création sécurisée d’utilisateurs
│     └─ history.js     # Récupère l’historique depuis Supabase
├─ public/
│  └─ logo.png
├─ styles/
│  └─ globals.css
├─ .env.local
├─ next.config.ts
├─ package.json
└─ tailwind.config.js
```

---

## 🔑 Variables d’environnement

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=<URL_SUPABASE>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
WEBHOOK_URL=<URL_WEBHOOK_MAKE>
```

---

## 🔗 Flux des données

1. L’utilisateur se connecte (Supabase Auth).  
2. Son email, nom et concession sont lus depuis `user_metadata`.  
3. L’utilisateur prend ou téléverse une photo et ajoute un commentaire.  
4. Les données (photo, email, concession, zone, commentaire) sont envoyées au webhook Make.com.  
5. Make.com traite le payload (ex. enregistrement externe).  
6. La page Historique interroge Supabase pour afficher les inventaires de l’utilisateur.

---

## 🚀 Commandes utiles

```bash
# Installation des dépendances
npm install

# Lancement en mode développement
npm run dev

# Build pour production
npm run build
```

---

## ✅ To-Do & améliorations possibles

- Prévisualisation des photos avant envoi  
- Notifications toast pour un meilleur retour utilisateur  
- Gestion des rôles fine-grained pour l’interface Admin  
- Mode hors-ligne (caching local)

---

## 📋 Exemple de payload envoyé au webhook

```json
{
  "email": "collaborateur@concession.com",
  "concession": "Nom de la concession",
  "zone": "Zone A",
  "comment": "Véhicule en bon état",
  "photo": "<fichier-binaire>"
}
```

---

## 🛠️ Prérequis

- Node.js 18+  
- Compte Supabase (tables `auth.users` + table `zones`)  
- Compte Make.com avec un webhook configuré

---

## 📃 Licence

Projet privé — Tous droits réservés