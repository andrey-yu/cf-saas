import { db } from './drizzle';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    // Add cancel_at_period_end column to teams table
    await db.execute(
      sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT FALSE;`
    );
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 