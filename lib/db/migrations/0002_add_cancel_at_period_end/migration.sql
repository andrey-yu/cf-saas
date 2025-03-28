-- Add cancel_at_period_end column to teams table
ALTER TABLE "teams" 
ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT FALSE; 