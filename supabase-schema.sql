-- 在 Supabase Dashboard -> SQL Editor 中执行。
-- 这组表对应：用户、用户菜品、点餐记录和点餐记录中的菜品。

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  cook_time text not null default '自定义',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('午饭', '晚饭')),
  created_at timestamptz not null default now(),
  unique (user_id, meal_date, meal_type)
);

create table if not exists public.meal_plan_dishes (
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  dish_id uuid not null references public.dishes(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (meal_plan_id, dish_id)
);

alter table public.profiles enable row level security;
alter table public.dishes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_dishes enable row level security;

create policy "profiles are readable by owner" on public.profiles for select using (auth.uid() = id);
create policy "users can create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users can update their profile" on public.profiles for update using (auth.uid() = id);

create policy "users can read their dishes" on public.dishes for select using (auth.uid() = user_id);
create policy "users can create their dishes" on public.dishes for insert with check (auth.uid() = user_id);
create policy "users can update their dishes" on public.dishes for update using (auth.uid() = user_id);
create policy "users can delete their dishes" on public.dishes for delete using (auth.uid() = user_id);

create policy "users can read their meal plans" on public.meal_plans for select using (auth.uid() = user_id);
create policy "users can create their meal plans" on public.meal_plans for insert with check (auth.uid() = user_id);
create policy "users can update their meal plans" on public.meal_plans for update using (auth.uid() = user_id);
create policy "users can delete their meal plans" on public.meal_plans for delete using (auth.uid() = user_id);

create policy "users can read their plan dishes" on public.meal_plan_dishes for select using (
  exists (select 1 from public.meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid())
);
create policy "users can add their plan dishes" on public.meal_plan_dishes for insert with check (
  exists (select 1 from public.meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid())
);
create policy "users can remove their plan dishes" on public.meal_plan_dishes for delete using (
  exists (select 1 from public.meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid())
);

insert into storage.buckets (id, name, public)
values ('dish-images', 'dish-images', true)
on conflict (id) do nothing;

create policy "users can upload dish images to their folder" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'dish-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users can update their dish images" on storage.objects
for update to authenticated
using (bucket_id = 'dish-images' and owner_id = auth.uid()::text);

create policy "users can delete their dish images" on storage.objects
for delete to authenticated
using (bucket_id = 'dish-images' and owner_id = auth.uid()::text);
