-- ========================================================
-- SyllabusShelf Supabase Database Schema
-- Run this in your Supabase Dashboard -> SQL Editor -> Run
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Subjects Table
create table if not exists public.subjects (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    code text,
    color text default '#6366f1',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Units Table
create table if not exists public.units (
    id uuid default uuid_generate_v4() primary key,
    subject_id uuid references public.subjects(id) on delete cascade not null,
    unit_number int not null,
    title text not null,
    keywords text[] default array[]::text[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Notes Table
create table if not exists public.notes (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    subject_id uuid references public.subjects(id) on delete set null,
    unit_id uuid references public.units(id) on delete set null,
    original_filename text not null,
    clean_title text not null,
    storage_path text not null,
    file_url text not null,
    file_size bigint default 0,
    summary text,
    confidence numeric default 1.0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set Row Level Security (RLS)
alter table public.subjects enable row level security;
alter table public.units enable row level security;
alter table public.notes enable row level security;

-- Policies for subjects
create policy "Users can view their own subjects" 
    on public.subjects for select using (auth.uid() = user_id);

create policy "Users can insert their own subjects" 
    on public.subjects for insert with check (auth.uid() = user_id);

create policy "Users can update their own subjects" 
    on public.subjects for update using (auth.uid() = user_id);

create policy "Users can delete their own subjects" 
    on public.subjects for delete using (auth.uid() = user_id);

-- Policies for units
create policy "Users can view their units" 
    on public.units for select using (
        exists (select 1 from public.subjects where subjects.id = units.subject_id and subjects.user_id = auth.uid())
    );

create policy "Users can insert their units" 
    on public.units for insert with check (
        exists (select 1 from public.subjects where subjects.id = units.subject_id and subjects.user_id = auth.uid())
    );

create policy "Users can delete their units" 
    on public.units for delete using (
        exists (select 1 from public.subjects where subjects.id = units.subject_id and subjects.user_id = auth.uid())
    );

-- Policies for notes
create policy "Users can view their own notes" 
    on public.notes for select using (auth.uid() = user_id);

create policy "Users can insert their own notes" 
    on public.notes for insert with check (auth.uid() = user_id);

create policy "Users can delete their own notes" 
    on public.notes for delete using (auth.uid() = user_id);

-- 4. Create Public Storage Bucket for Notes
insert into storage.buckets (id, name, public) 
values ('notes', 'notes', true)
on conflict (id) do nothing;

create policy "Public Access to Notes"
    on storage.objects for select
    using (bucket_id = 'notes');

create policy "Authenticated Users can upload notes"
    on storage.objects for insert
    with check (bucket_id = 'notes' and auth.role() = 'authenticated');
