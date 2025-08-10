# 🚗 Fleet Snap — Inventory Management for Car Dealerships

Fleet Snap is a mobile-first Next.js application that lets dealership staff quickly log vehicle inventories by snapping a photo of the license plate or VIN. All processing (image upload, OCR/VIN parsing, data storage) happens in-app via Supabase and Google’s Gemini Flash 2.0 — no Make.com required.

---

## 📋 Key Features

### 🔑 Authentication
- Email/password sign-in via **Supabase Auth**
- User metadata (name, concession) stored in `user_metadata`

### 🌍 Zone Management
- Dynamic list of zones loaded from Supabase table `zones`
- Create new zones directly in the UI

### 📸 Inventory Capture
- Snap or upload one or more photos of plate/VIN
- Serverless upload to **Supabase Storage**
- OCR / VIN parsing with **Google Gemini Flash 2.0** via GenAI SDK
- Save each record in a Postgres table `inventaire` with:
  - `user_id`, `email`, `name`, `concession`
  - `zone`, `commentaire`, `photo_url`, `identifiant` (OCR result)
  - `created_at`

### 📜 History
- View your past inventories in a paginated list
- Thumbnails loaded from permanent public URLs
- Editable VIN/plate and comments in place
- Delete entries on demand

### 👥 Admin Interface
- List all users, sorted alphabetically by name or email
- Create new users (email/password/concession) via a secured API route using Supabase Service Role Key

### 📤 CSV Export
- Export inventory data filtered by:
  - **Concession** (dropdown pre-filled from your profile)
  - **Date range** (start/end)
- Generates a BOM-prefixed UTF-8 CSV (`\uFEFF…`) for Excel compatibility
- Sends CSV via email using **Brevo** SMTP API

---

## ⚙️ Tech Stack

| Technology             | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| **Next.js**            | React framework + API routes               |
| **Tailwind CSS**       | Responsive, utility-first styling          |
| **Supabase**           | Auth, Postgres, Storage, Serverless APIs   |
| **Google GenAI SDK**   | Gemini Flash 2.0 OCR/VIN parsing           |
| **React DatePicker**   | Date range selection                       |
| **Brevo SMTP API**     | CSV export email delivery                  |
| **Formidable**         | Multipart form parsing in Next.js APIs     |

---

## 🗂️ Project Structure

```text
fleet-snap/
├─ components/  
│  ├─ Header.js  
│  └─ Layout.js  
├─ pages/  
│  ├─ index.js        # Login  
│  ├─ inventory.js    # Capture & submit inventory  
│  ├─ history.js      # Paginated history + export modal  
│  ├─ profile.js      # Update user profile  
│  ├─ admin.js        # Admin: list/create users  
│  ├─ api/  
│  │  ├─ inventory.js       # Handle uploads, OCR, DB insert  
│  │  ├─ history.js         # Fetch user’s history  
│  │  ├─ getConcessions.js  # List concessions for export  
│  │  ├─ createUser.js      # Admin user creation  
│  │  └─ exportInventory.js # Generate & email CSV  
├─ public/  
│  └─ logo.png  
├─ styles/  
│  └─ globals.css  
├─ .env.local  
├─ next.config.js  
├─ package.json  
└─ tailwind.config.js  
```

---

## 🔑 Environment Variables

Create a `.env.local` in your project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_STORAGE_BUCKET=photos

# Google Gemini Flash 2.0
GEMINI_API_KEY=<your-gemini-api-key>

# Brevo SMTP (CSV export)
BREVO_API_KEY=<your-brevo-api-key>
BREVO_SENDER_EMAIL=<sender-email@example.com>
```

> **Note:** On Vercel, configure the same vars under **Settings → Environment Variables** for both Preview and Production.

---

## 🚀 Getting Started

1. **Install dependencies**  
   ```bash
   npm install
   ```
2. **Run in development**  
   ```bash
   npm run dev
   ```
3. **Build for production**  
   ```bash
   npm run build
   npm run start
   ```

---

## ⚙️ How It Works

1. **Login** via Supabase Auth.  
2. **Capture** photo(s) and optional comment → Frontend sends `FormData` with image(s), zone, comment to `/api/inventory`.  
3. **API** (`inventory.js`):
   - Verifies JWT, fetches user metadata
   - Uploads image buffer to Supabase Storage → permanent public URL
   - Calls Gemini Flash 2.0 with inline base64 data → extracts plate/VIN
   - Inserts one row per photo in `inventaire`
4. **History** (`history.js`):
   - Fetches paginated records via `/api/history`
   - Displays thumbnails, plate/VIN, zone, comment, collaborator, date
   - Edit/Delete in place
   - Export modal → select concession & dates → sends POST to `/api/exportInventory`
5. **Export**:
   - Generates CSV with BOM UTF-8
   - Emails via Brevo

---

## 🛠️ Next Steps & To-Dos

- **Multi-photo upload** on the frontend (preview thumbnails + progress bar)  
- **Offline support** (caching & PWA)  
- **Role-based access control** (fine-grained permissions in Supabase)  
- **Retry/fallback OCR** (Google Vision API or Tesseract.js)  
- **Notifications** (toasts on success/error)

---

## 📃 License

Private project — all rights reserved