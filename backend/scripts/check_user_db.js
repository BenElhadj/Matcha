// Small helper to check if user exists in DB by username/email
// Usage: node backend/scripts/check_user_db.js <username>

require('dotenv').config();
const db = require('../src/config/db');

const username = process.argv[2] || 'testlocal907463';
(async () => {
  try {
    console.log(`Searching for user with username='${username}'`);
  const res = await db.query('SELECT id, first_name, last_name, username, email, verified, vkey, created_at FROM users WHERE username = $1', [username]);
    if (!res || !res.rows) {
      console.log('No rows returned (unexpected)');
      process.exit(0);
    }
    if (res.rows.length === 0) {
      console.log('USER_NOT_FOUND');
    } else {
      console.log('FOUND_USER');
      console.log(JSON.stringify(res.rows, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error('ERROR_QUERYING_DB', err.message || err);
    process.exit(2);
  }
})();
