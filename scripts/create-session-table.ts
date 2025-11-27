
import { pool } from "../server/db";

async function createSessionTable() {
    console.log("Starting session table creation...");
    try {
        // Create table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);
    `);
        console.log("Table 'session' created (or already exists).");

        // Add primary key
        try {
            await pool.query(`
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
      `);
            console.log("Primary key added.");
        } catch (e: any) {
            if (e.code === '42P16') { // multiple primary keys
                console.log("Primary key already exists.");
            } else {
                console.log("Note: Primary key creation skipped or failed (might already exist):", e.message);
            }
        }

        // Add index
        try {
            await pool.query(`
        CREATE INDEX "IDX_session_expire" ON "session" ("expire");
      `);
            console.log("Index 'IDX_session_expire' created.");
        } catch (e: any) {
            if (e.code === '42P07') { // duplicate relation
                console.log("Index already exists.");
            } else {
                console.log("Note: Index creation skipped or failed:", e.message);
            }
        }

        console.log("Session table setup completed successfully.");
    } catch (error) {
        console.error("Error creating session table:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createSessionTable();
