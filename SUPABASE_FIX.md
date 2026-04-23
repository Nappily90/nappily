## Fix RLS policy — run in Supabase SQL Editor

```sql
-- Drop existing policy and recreate with strict separation
drop policy if exists "Users can manage their own profile" on baby_profiles;

-- Separate read and write policies for clarity
create policy "Users can read own profile"
  on baby_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on baby_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on baby_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own profile"
  on baby_profiles for delete
  using (auth.uid() = user_id);
```
