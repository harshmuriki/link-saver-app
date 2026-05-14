# LinkSaver

A simple, API-first link-saving application designed for Apple Shortcuts integration. Save links with one tap, auto-fetch metadata, and manage everything from a clean dashboard.

## Features

- **API-First Design**: Simple REST API optimized for Apple Shortcuts
- **Auto-Fetch Metadata**: Automatically extracts title, description, and images from URLs
- **Smart Duplicate Handling**: Updates existing links instead of creating duplicates
- **Flexible Filtering**: Filter by read status, favorites, domain, and date range
- **Export Options**: Export links as JSON, CSV, or HTML bookmarks
- **Clean Dashboard**: Modern dark-themed UI for managing your links
- **Secure**: API key authentication with Row Level Security (RLS)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: API Key-based
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Vercel

---

## Prerequisites

Before you begin, ensure you have:

- [Node.js](https://nodejs.org/) 18.x or later
- [pnpm](https://pnpm.io/) package manager (recommended) or npm/yarn
- A [Vercel](https://vercel.com/) account (free tier works)
- A [Supabase](https://supabase.com/) account (free tier works)

---

## Setup Instructions

### Step 1: Clone the Repository

```bash
git clone https://github.com/harshmuriki/link-saver-app.git
cd link-saver-app
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign in
2. Click **New Project**
3. Fill in the project details:
   - **Name**: `link-saver` (or any name you prefer)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose the region closest to you
4. Click **Create new project** and wait for it to be ready (about 2 minutes)

### Step 4: Set Up the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy and paste the following SQL, then click **Run**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends auth.users with API key)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links table
CREATE TABLE IF NOT EXISTS public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  domain TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, url)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_links_user_id ON public.links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON public.links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_domain ON public.links(domain);
CREATE INDEX IF NOT EXISTS idx_links_is_read ON public.links(is_read);
CREATE INDEX IF NOT EXISTS idx_links_is_favorite ON public.links(is_favorite);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON public.users(api_key);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (auth.uid() = id);

-- RLS Policies for links table
CREATE POLICY "links_select_own" ON public.links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "links_insert_own" ON public.links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "links_update_own" ON public.links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "links_delete_own" ON public.links FOR DELETE USING (auth.uid() = user_id);

-- Trigger function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_links_updated_at ON public.links;
CREATE TRIGGER update_links_updated_at
  BEFORE UPDATE ON public.links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

You should see "Success. No rows returned" after running the query.

### Step 5: Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** (gear icon) > **API**
2. You'll need these values:
   - **Project URL**: Under "Project URL" (e.g., `https://xxxxx.supabase.co`)
   - **anon public key**: Under "Project API keys" > `anon` `public`
   - **service_role key**: Under "Project API keys" > `service_role` `secret` (click to reveal)

### Step 6: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

If `.env.example` doesn't exist, create `.env.local` with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace the placeholder values with your actual Supabase credentials from Step 5.

### Step 7: Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 8: Create an Account

1. Go to [http://localhost:3000/auth/sign-up](http://localhost:3000/auth/sign-up)
2. Enter your email and password
3. Check your email for the confirmation link and click it
4. You'll be redirected to the dashboard

### Step 9: Get Your API Key

1. Go to [http://localhost:3000/dashboard/api-key](http://localhost:3000/dashboard/api-key)
2. Your API key is displayed on this page
3. Copy it for use in Apple Shortcuts or API testing

---

## Deployment to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com/) and sign in
3. Click **Add New...** > **Project**
4. Import your GitHub repository
5. Configure Environment Variables:
   - Click **Environment Variables**
   - Add the three variables from your `.env.local` file:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
6. Click **Deploy**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --yes

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Redeploy with environment variables
vercel --prod
```

### Post-Deployment: Update Supabase Auth Settings

After deploying, update your Supabase project to allow authentication from your production domain:

1. Go to your Supabase project > **Authentication** > **URL Configuration**
2. Add your Vercel deployment URL to **Site URL**: `https://your-app.vercel.app`
3. Add to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## API Documentation

### Authentication

All API endpoints require authentication via API key. Include it in one of these ways:

**Header (Recommended)**:
```
X-API-Key: your-api-key-here
```

**Query Parameter**:
```
?api_key=your-api-key-here
```

### Endpoints

#### Save a Link

```http
POST /api/links
Content-Type: application/json
X-API-Key: your-api-key

{
  "url": "https://example.com/article",
  "title": "Optional custom title"
}
```

**Response**:
```json
{
  "success": true,
  "link": {
    "id": "uuid",
    "url": "https://example.com/article",
    "title": "Page Title",
    "description": "Page description...",
    "image_url": "https://example.com/og-image.jpg",
    "domain": "example.com",
    "is_read": false,
    "is_favorite": false,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "is_new": true
}
```

#### Get All Links

```http
GET /api/links?sort=created_at&order=desc&limit=50
X-API-Key: your-api-key
```

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort` | string | `created_at` | Sort by: `created_at`, `title`, `domain` |
| `order` | string | `desc` | Order: `asc`, `desc` |
| `is_read` | boolean | - | Filter by read status |
| `is_favorite` | boolean | - | Filter by favorite status |
| `domain` | string | - | Filter by domain |
| `search` | string | - | Search in title, description, URL |
| `from` | ISO date | - | Links saved after this date |
| `to` | ISO date | - | Links saved before this date |
| `limit` | number | 50 | Max results (1-100) |
| `offset` | number | 0 | Pagination offset |

#### Get Single Link

```http
GET /api/links/{id}
X-API-Key: your-api-key
```

#### Update Link

```http
PATCH /api/links/{id}
Content-Type: application/json
X-API-Key: your-api-key

{
  "title": "Updated title",
  "is_read": true,
  "is_favorite": true
}
```

#### Delete Link

```http
DELETE /api/links/{id}
X-API-Key: your-api-key
```

#### Mark as Read/Unread

```http
POST /api/links/{id}/read
X-API-Key: your-api-key

DELETE /api/links/{id}/read
X-API-Key: your-api-key
```

#### Toggle Favorite

```http
POST /api/links/{id}/favorite
X-API-Key: your-api-key

DELETE /api/links/{id}/favorite
X-API-Key: your-api-key
```

#### Export Links

```http
GET /api/links/export?format=json&from=2024-01-01
X-API-Key: your-api-key
```

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | `json` | Export format: `json`, `csv`, `html` |
| `from` | ISO date | - | Export links after this date |
| `to` | ISO date | - | Export links before this date |
| `is_read` | boolean | - | Filter by read status |
| `is_favorite` | boolean | - | Filter by favorite status |

#### Export by Date Range (Optimized for Shortcuts)

```http
GET /api/links/export/by-date?from=2024-01-15&format=csv
X-API-Key: your-api-key
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | ISO date | Yes | Start of date range |
| `to` | ISO date | No | End of date range (default: now) |
| `format` | string | No | `json`, `csv`, `html` (default: `json`) |

#### Get Statistics

```http
GET /api/links/stats
X-API-Key: your-api-key
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "total_links": 150,
    "unread_count": 45,
    "favorites_count": 12,
    "domains_count": 23
  }
}
```

#### Regenerate API Key

```http
POST /api/user/api-key
```

Note: This endpoint requires session authentication (logged in via web dashboard), not API key.

---

## Apple Shortcuts Setup

### Quick Save Shortcut

Create a new Shortcut with these actions:

1. **Receive** input from Share Sheet (URLs)
2. **Get URLs from Input**
3. **Get Contents of URL**:
   - URL: `https://your-app.vercel.app/api/links`
   - Method: POST
   - Headers:
     - `X-API-Key`: your-api-key
     - `Content-Type`: application/json
   - Request Body: JSON
     - `url`: Shortcut Input
4. **Show Notification**: "Link saved!"

### Example cURL Command

```bash
curl -X POST "https://your-app.vercel.app/api/links" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"url": "https://github.com/vercel/next.js"}'
```

---

## Project Structure

```
link-saver-app/
├── app/
│   ├── api/
│   │   ├── links/
│   │   │   ├── route.ts              # GET (list), POST (create)
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts          # GET, PATCH, DELETE
│   │   │   │   ├── read/route.ts     # POST, DELETE
│   │   │   │   └── favorite/route.ts # POST, DELETE
│   │   │   ├── stats/route.ts        # GET
│   │   │   └── export/
│   │   │       ├── route.ts          # GET (general export)
│   │   │       └── by-date/route.ts  # GET (date-range export)
│   │   └── user/
│   │       └── api-key/route.ts      # GET, POST
│   ├── auth/
│   │   ├── callback/route.ts
│   │   ├── login/page.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── sign-up-success/page.tsx
│   │   └── error/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Main dashboard
│   │   ├── api-key/page.tsx          # API key management
│   │   └── settings/page.tsx         # Account settings
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # Landing page
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── dashboard-nav.tsx
│   ├── link-card.tsx
│   ├── link-filters.tsx
│   └── stats-cards.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   ├── admin.ts                  # Admin client (service role)
│   │   └── middleware.ts
│   ├── api-auth.ts                   # API key validation
│   ├── fetch-metadata.ts             # Open Graph fetcher
│   ├── types.ts
│   └── utils.ts
├── middleware.ts
├── .env.local                        # Environment variables (create this)
├── package.json
└── README.md
```

---

## Free Tier Limits

**Supabase Free Tier**:
- 500 MB database storage
- 5 GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

**Vercel Free Tier (Hobby)**:
- 100,000 serverless function invocations/month
- 100 GB bandwidth/month

For personal use with Apple Shortcuts, you can make approximately **3,300 API calls per day** within free tier limits.

---

## Troubleshooting

### "Invalid API key" Error
- Ensure you're using the correct API key from `/dashboard/api-key`
- Check that you've confirmed your email after signing up
- Try regenerating your API key

### "Email not confirmed" Error
- Check your email inbox (and spam folder) for the confirmation email
- Click the confirmation link in the email
- Try signing up again if the link expired

### Links Not Showing Metadata
- Some websites block metadata fetching
- The metadata fetch has a 5-second timeout
- Links are saved even if metadata fetch fails

### Database Connection Issues
- Verify your Supabase credentials in `.env.local`
- Ensure your Supabase project is active (not paused)
- Check that RLS policies were created correctly

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

## Built With

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Database and authentication
- [Vercel](https://vercel.com/) - Deployment platform
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [v0](https://v0.app/) - AI-powered development

---

[Continue developing on v0](https://v0.app/chat/projects/prj_EYGBYqL6rYSR5PhBUnKjvW8tLf4B)
