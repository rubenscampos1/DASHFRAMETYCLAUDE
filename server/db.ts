import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use standard PostgreSQL in production (Render), Neon in development (Replit)
// For local development (localhost), use standard PostgreSQL
const isProduction = process.env.NODE_ENV === 'production';
const isLocalhost = process.env.DATABASE_URL.includes('localhost') ||
                     process.env.DATABASE_URL.includes('127.0.0.1');

let pool: any;
let db: any;

if (isLocalhost || isProduction) {
  // Standard PostgreSQL connection for Render or Local Development
  pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalhost ? false : { rejectUnauthorized: false }
  });
  db = drizzlePg({ client: pool, schema });
} else {
  // Neon serverless connection for Replit
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
}

export { pool, db };
