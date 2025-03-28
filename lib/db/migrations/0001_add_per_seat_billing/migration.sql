-- Add per-seat billing columns to teams table
ALTER TABLE "teams" 
ADD COLUMN IF NOT EXISTS "seats_billed" integer,
ADD COLUMN IF NOT EXISTS "next_billing_date" timestamp;

-- Create an index on invitations.email to optimize invitation lookups
CREATE INDEX IF NOT EXISTS "invitations_email_idx" ON "invitations" ("email"); 