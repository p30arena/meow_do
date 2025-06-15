import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql', // Use 'postgresql' for the dialect
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Use 'url' instead of 'connectionString'
  },
});
