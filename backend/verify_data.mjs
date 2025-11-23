import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true }
});

async function checkData() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT application_id, business_name, application_status, submitted_date
      FROM supplier_applications 
      ORDER BY submitted_date DESC
      LIMIT 10
    `);
    
    console.log('\nRecent supplier applications:');
    console.log('─'.repeat(120));
    result.rows.forEach(row => {
      console.log(`${row.application_id.padEnd(10)} | ${row.business_name.padEnd(40)} | ${row.application_status.padEnd(20)} | ${row.submitted_date}`);
    });
    console.log('─'.repeat(120));
    console.log(`Total: ${result.rows.length} applications\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

checkData();
