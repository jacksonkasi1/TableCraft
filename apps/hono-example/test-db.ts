import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!);

async function test() {
  try {
    const res = await sql`select 1 as x`;
    console.log('Connected:', res);
    process.exit(0);
  } catch (e) {
    console.error('Connection failed:', e);
    process.exit(1);
  }
}

test();
