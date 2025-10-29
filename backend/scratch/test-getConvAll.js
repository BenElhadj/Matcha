require('dotenv').config();
const { pool } = require('../src/config/database');

(async () => {
  try {
    const userId = process.argv[2] ? Number(process.argv[2]) : 1;
    const q = `
      SELECT
          u.id as user_id,
          c.id_conversation,
          c.last_update,
          u.username,
          u.first_name,
          u.last_name,
          u.status,
          COALESCE(i.link, i.data, '') as profile_image,
          ch.message,
          ch.id_from as message_from,
          i.profile
      FROM conversations c
      INNER JOIN users u ON c.id_user2 = u.id
      LEFT JOIN images i ON c.id_user2 = i.user_id AND i.profile = TRUE::boolean
      LEFT JOIN chat ch ON c.last_msg = ch.id
      WHERE c.id_user1 = $1 AND c.allowed = TRUE
      UNION
      SELECT
          u.id as user_id,
          c.id_conversation,
          c.last_update,
          u.username,
          u.first_name,
          u.last_name,
          u.status,
          COALESCE(i.link, i.data, '') as profile_image,
          ch.message,
          ch.id_from as message_from,
          i.profile
      FROM conversations c
      INNER JOIN users u ON c.id_user1 = u.id
      LEFT JOIN images i ON c.id_user1 = i.user_id AND i.profile = TRUE::boolean
      LEFT JOIN chat ch ON c.last_msg = ch.id
      WHERE c.id_user2 = $1 AND c.allowed = TRUE
    `;
    const r = await pool.query(q, [userId]);
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    console.error(e);
    process.exit(1);
  }
})();
