import pool from '../src/config/database.js';
import { seedDatabase } from './seed.js';

const force = process.argv.includes('--force');

seedDatabase({ force })
  .then(async (result) => {
    if (result.skipped) {
      console.log('[setup] Database already contains users; demo seed was skipped.');
    }
    await pool.end();
  })
  .catch(async (error) => {
    console.error('[setup] Failed:', error);
    await pool.end();
    process.exit(1);
  });
