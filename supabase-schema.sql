-- ==============================================================================
-- EULER 3D: SUPABASE DATABASE SETUP & SCHEMA DEFINITION
-- Run this script inside your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Drop existing table if created improperly earlier
DROP TABLE IF EXISTS public.simulation_presets CASCADE;

-- 2. Create Simulation Presets Table with explicit columns
CREATE TABLE public.simulation_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lab_id TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Index for fast querying by user and lab
CREATE INDEX idx_simulation_presets_user_lab 
ON public.simulation_presets(user_id, lab_id);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.simulation_presets ENABLE ROW LEVEL SECURITY;

-- 5. Create Row-Level Security Policies
-- Policy: Users can view only their own presets
CREATE POLICY "Users can select their own simulation presets"
ON public.simulation_presets
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own presets
CREATE POLICY "Users can insert their own simulation presets"
ON public.simulation_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own presets
CREATE POLICY "Users can update their own simulation presets"
ON public.simulation_presets
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own presets
CREATE POLICY "Users can delete their own simulation presets"
ON public.simulation_presets
FOR DELETE
USING (auth.uid() = user_id);

