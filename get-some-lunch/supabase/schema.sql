-- Get Some Lunch - Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text not null,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view any profile"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Groups
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  office_address text,
  lat double precision,
  lng double precision,
  invite_code text unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null
);

alter table public.groups enable row level security;

create policy "Members can view their groups"
  on public.groups for select
  using (id in (select group_id from public.group_members where user_id = auth.uid()));

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "Admins can update their groups"
  on public.groups for update
  using (id in (
    select group_id from public.group_members
    where user_id = auth.uid() and role = 'admin'
  ));

-- Allow reading group by invite code (for joining)
create policy "Anyone can view group by invite code"
  on public.groups for select
  using (true);

-- Group Members
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('admin', 'member')) default 'member' not null,
  joined_at timestamptz default now() not null,
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "Members can view group members"
  on public.group_members for select
  using (group_id in (select group_id from public.group_members gm where gm.user_id = auth.uid()));

create policy "Authenticated users can join groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on public.group_members for delete
  using (auth.uid() = user_id);

-- Restaurants
create table public.restaurants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text,
  category text,
  lat double precision,
  lng double precision,
  foursquare_id text unique,
  created_at timestamptz default now() not null
);

alter table public.restaurants enable row level security;

create policy "Authenticated users can view restaurants"
  on public.restaurants for select using (auth.uid() is not null);

create policy "Authenticated users can add restaurants"
  on public.restaurants for insert with check (auth.uid() is not null);

-- Group Restaurants (links restaurants to groups)
create table public.group_restaurants (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  added_by uuid references public.profiles(id) not null,
  added_at timestamptz default now() not null,
  unique (group_id, restaurant_id)
);

alter table public.group_restaurants enable row level security;

create policy "Members can view group restaurants"
  on public.group_restaurants for select
  using (group_id in (select group_id from public.group_members where user_id = auth.uid()));

create policy "Members can add restaurants to their groups"
  on public.group_restaurants for insert
  with check (group_id in (select group_id from public.group_members where user_id = auth.uid()));

create policy "Members can remove restaurants from their groups"
  on public.group_restaurants for delete
  using (group_id in (
    select group_id from public.group_members
    where user_id = auth.uid() and role = 'admin'
  ));

-- Preferences
create table public.preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  group_restaurant_id uuid references public.group_restaurants(id) on delete cascade not null,
  frequency text check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'rarely', 'never'))
    default 'weekly' not null,
  updated_at timestamptz default now() not null,
  unique (user_id, group_restaurant_id)
);

alter table public.preferences enable row level security;

create policy "Users can view preferences in their groups"
  on public.preferences for select
  using (
    group_restaurant_id in (
      select gr.id from public.group_restaurants gr
      join public.group_members gm on gm.group_id = gr.group_id
      where gm.user_id = auth.uid()
    )
  );

create policy "Users can manage their own preferences"
  on public.preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.preferences for update
  using (auth.uid() = user_id);

-- Sessions (a lunch outing for a day)
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  session_date date default current_date not null,
  status text check (status in ('gathering', 'suggesting', 'voting', 'decided', 'completed'))
    default 'gathering' not null,
  winner_group_restaurant_id uuid references public.group_restaurants(id),
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null
);

alter table public.sessions enable row level security;

create policy "Members can view sessions"
  on public.sessions for select
  using (group_id in (select group_id from public.group_members where user_id = auth.uid()));

create policy "Members can create sessions"
  on public.sessions for insert
  with check (group_id in (select group_id from public.group_members where user_id = auth.uid()));

create policy "Members can update sessions"
  on public.sessions for update
  using (group_id in (select group_id from public.group_members where user_id = auth.uid()));

-- Session Members
create table public.session_members (
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now() not null,
  primary key (session_id, user_id)
);

alter table public.session_members enable row level security;

create policy "Members can view session members"
  on public.session_members for select
  using (session_id in (
    select s.id from public.sessions s
    join public.group_members gm on gm.group_id = s.group_id
    where gm.user_id = auth.uid()
  ));

create policy "Users can join sessions"
  on public.session_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave sessions"
  on public.session_members for delete
  using (auth.uid() = user_id);

-- Candidates (generated suggestions for a session)
create table public.candidates (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  group_restaurant_id uuid references public.group_restaurants(id) on delete cascade not null,
  score double precision not null
);

alter table public.candidates enable row level security;

create policy "Members can view candidates"
  on public.candidates for select
  using (session_id in (
    select s.id from public.sessions s
    join public.group_members gm on gm.group_id = s.group_id
    where gm.user_id = auth.uid()
  ));

create policy "Members can create candidates"
  on public.candidates for insert
  with check (session_id in (
    select s.id from public.sessions s
    join public.group_members gm on gm.group_id = s.group_id
    where gm.user_id = auth.uid()
  ));

-- Votes
create table public.votes (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references public.candidates(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rank integer not null check (rank >= 1),
  unique (candidate_id, user_id)
);

alter table public.votes enable row level security;

create policy "Members can view votes in their sessions"
  on public.votes for select
  using (candidate_id in (
    select c.id from public.candidates c
    join public.sessions s on s.id = c.session_id
    join public.group_members gm on gm.group_id = s.group_id
    where gm.user_id = auth.uid()
  ));

create policy "Users can cast votes"
  on public.votes for insert
  with check (auth.uid() = user_id);

create policy "Users can change votes"
  on public.votes for update
  using (auth.uid() = user_id);

-- Visits (confirmed lunch outings)
create table public.visits (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  restaurant_id uuid references public.restaurants(id) not null,
  group_id uuid references public.groups(id) not null,
  visit_date date default current_date not null
);

alter table public.visits enable row level security;

create policy "Members can view visits"
  on public.visits for select
  using (group_id in (select group_id from public.group_members where user_id = auth.uid()));

create policy "Members can record visits"
  on public.visits for insert
  with check (group_id in (select group_id from public.group_members where user_id = auth.uid()));

-- Visit Ratings
create table public.visit_ratings (
  id uuid default gen_random_uuid() primary key,
  visit_id uuid references public.visits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  note text,
  unique (visit_id, user_id)
);

alter table public.visit_ratings enable row level security;

create policy "Members can view ratings"
  on public.visit_ratings for select
  using (visit_id in (
    select v.id from public.visits v
    join public.group_members gm on gm.group_id = v.group_id
    where gm.user_id = auth.uid()
  ));

create policy "Users can rate visits"
  on public.visit_ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their ratings"
  on public.visit_ratings for update
  using (auth.uid() = user_id);

-- Enable realtime for session-related tables
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_members;
alter publication supabase_realtime add table public.candidates;
alter publication supabase_realtime add table public.votes;
