## Add brand column — run in Supabase SQL Editor

```sql
alter table baby_profiles
  add column if not exists brand text,
  add column if not exists other_brand text;
```
