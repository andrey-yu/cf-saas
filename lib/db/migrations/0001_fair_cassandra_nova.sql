ALTER TABLE "teams" ADD COLUMN "seats_billed" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "next_billing_date" timestamp;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "cancel_at_period_end" boolean;