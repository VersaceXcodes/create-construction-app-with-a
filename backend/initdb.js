import dotenv from "dotenv";
import fs from "fs";
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { require: true } 
      }
    : {
        host: PGHOST || "ep-ancient-dream-abbsot9k-pooler.eu-west-2.aws.neon.tech",
        database: PGDATABASE || "neondb",
        user: PGUSER || "neondb_owner",
        password: PGPASSWORD || "npg_jAS3aITLC5DX",
        port: Number(PGPORT),
        ssl: { require: true },
      }
);


async function initDb() {
  const client = await pool.connect();
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Drop existing tables in reverse dependency order to handle foreign key constraints
    console.log('Dropping existing tables if they exist...');
    const dropTablesSQL = `
      DROP TABLE IF EXISTS chat_messages CASCADE;
      DROP TABLE IF EXISTS chat_conversations CASCADE;
      DROP TABLE IF EXISTS issue_messages CASCADE;
      DROP TABLE IF EXISTS issues CASCADE;
      DROP TABLE IF EXISTS ticket_responses CASCADE;
      DROP TABLE IF EXISTS support_tickets CASCADE;
      DROP TABLE IF EXISTS product_views CASCADE;
      DROP TABLE IF EXISTS search_history CASCADE;
      DROP TABLE IF EXISTS inventory_logs CASCADE;
      DROP TABLE IF EXISTS financial_transactions CASCADE;
      DROP TABLE IF EXISTS payouts CASCADE;
      DROP TABLE IF EXISTS promo_code_usage CASCADE;
      DROP TABLE IF EXISTS promotions CASCADE;
      DROP TABLE IF EXISTS surplus_transactions CASCADE;
      DROP TABLE IF EXISTS surplus_offers CASCADE;
      DROP TABLE IF EXISTS surplus_listings CASCADE;
      DROP TABLE IF EXISTS project_items CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      DROP TABLE IF EXISTS wishlist_items CASCADE;
      DROP TABLE IF EXISTS review_votes CASCADE;
      DROP TABLE IF EXISTS reviews CASCADE;
      DROP TABLE IF EXISTS order_timeline CASCADE;
      DROP TABLE IF EXISTS deliveries CASCADE;
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS cart_items CASCADE;
      DROP TABLE IF EXISTS carts CASCADE;
      DROP TABLE IF EXISTS payment_methods CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS delivery_zones CASCADE;
      DROP TABLE IF EXISTS platform_settings CASCADE;
      DROP TABLE IF EXISTS flagged_content CASCADE;
      DROP TABLE IF EXISTS admin_activity_logs CASCADE;
      DROP TABLE IF EXISTS supplier_applications CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS admins CASCADE;
      DROP TABLE IF EXISTS suppliers CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;
      DROP TABLE IF EXISTS addresses CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `;
    
    await client.query(dropTablesSQL);
    console.log('Existing tables dropped successfully');
    
    // Read and split SQL commands
    const dbInitCommands = fs
      .readFileSync(`./db.sql`, "utf-8")
      .toString()
      .split(/(?=CREATE TABLE |INSERT INTO)/);

    // Execute each command
    for (let cmd of dbInitCommands) {
      const trimmedCmd = cmd.trim();
      if (trimmedCmd) {
        console.dir({ "backend:db:init:command": trimmedCmd.substring(0, 100) + '...' });
        await client.query(trimmedCmd);
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('Database initialization completed successfully');
  } catch (e) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', e);
    throw e;
  } finally {
    // Release client back to pool
    client.release();
  }
}

// Execute initialization
initDb().catch(console.error);
