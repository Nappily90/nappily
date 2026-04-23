# Supabase Setup

Run these SQL commands in Supabase → SQL Editor.

## 1. Push subscriptions table

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  endpoint text not null,
  subscription text not null,
  updated_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Users can manage their own subscription"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 2. Netlify environment variables

Add these in Netlify → Site settings → Environment variables:

| Key | Value |
|-----|-------|
| VITE_SUPABASE_URL | https://mwdryzfskhkjwwoqlfpo.supabase.co |
| VITE_SUPABASE_ANON_KEY | eyJhbGci... (your anon key) |
| SUPABASE_SERVICE_ROLE_KEY | (from Supabase → Settings → API → service_role key) |
| VITE_VAPID_PUBLIC_KEY | BK-Yw1D1gjhRB3J0bSfDG9ZCLPD_FMRtzdO9NBzOiHxk-VuJmlBOfr7xY58WJQbXYDbX0XaU-cHB8iT8Hybr10U |
| VAPID_PRIVATE_KEY | bENeGO-ckMZT4XCyfU_5TgrKhOnMQKfZFlrs4PQvf5I |
| VAPID_EMAIL | mailto:admin@nappily.app |

## 3. Add brand columns to baby_profiles

```sql
alter table baby_profiles
  add column if not exists brand text,
  add column if not exists other_brand text;
```
