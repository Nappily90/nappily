# Nappily

Calm nappy planning for busy parents.

## Quick start

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://mwdryzfskhkjwwoqlfpo.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key_here
```

## Deploy to Netlify

1. Push to GitHub
2. Connect repo in Netlify dashboard
3. Set environment variables in **Netlify → Site settings → Environment variables**:
   - `VITE_SUPABASE_URL` = `https://mwdryzfskhkjwwoqlfpo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your publishable key
4. Deploy

Build command: `npm install && npm run build`
Publish directory: `dist`

## Supabase auth setup

In your Supabase dashboard:
1. Go to **Authentication → Providers** — Email is enabled by default
2. Go to **Authentication → URL Configuration**
   - Add your Netlify URL to **Site URL**: `https://your-app.netlify.app`
   - Add to **Redirect URLs**: `https://your-app.netlify.app/**`
3. Optionally turn off email confirmation in **Authentication → Settings**
   for easier testing (re-enable before going live)

## Project structure

```
src/
├── lib/
│   ├── supabase.js       ← Supabase client (reads from env vars)
│   ├── auth.js           ← signIn, signUp, resetPassword, signOut
│   └── prediction.js     ← prediction engine
├── hooks/
│   ├── useAuth.js        ← tracks Supabase session state
│   └── usePrediction.js  ← memoised prediction hook
├── components/
│   ├── AuthScreen.jsx    ← login / signup / reset password
│   ├── Landing.jsx
│   ├── Dashboard.jsx
│   └── ...
└── App.jsx               ← auth gate → full app
```
