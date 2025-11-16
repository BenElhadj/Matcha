const db = require('../config/database')
// Fusionne les utilisateurs qui m'ont bloqué et ceux qui m'ont signalé, avec type block/report
const getBlockedOrReportedBy = async (id, limit = 25, offset = 0) => {
    const query = `
        SELECT 
            blocked.blocker AS user_id, 
            users.username, users.first_name, users.last_name, users.gender, users.birthdate, 
            images.link, images.data, blocked.created_at, get_rating(users.id) AS rating,
            blocked.type AS type
        FROM blocked 
        JOIN users ON blocked.blocker = users.id 
        LEFT JOIN images ON users.id = images.user_id AND images.profile = TRUE 
        WHERE blocked.blocked = $1 AND (blocked.type = 'block' OR blocked.type = 'report')
        ORDER BY blocked.created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [id, limit, offset]);
    const isValid = v => v && v !== 'false' && v !== '' && v !== null && v !== undefined;
    return result.rows.map(row => {
        let avatar = null;
        if (isValid(row.link)) {
            avatar = row.link;
        } else if (isValid(row.data)) {
            avatar = `data:image/png;base64,${row.data}`;
        } else {
            avatar = null;
        }
        return {
            user_id: row.user_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            gender: row.gender,
            birthdate: row.birthdate,
            avatar,
            created_at: row.created_at,
            rating: row.rating,
            type: row.type
        };
    });
};

module.exports = {
    getBlockedOrReportedBy
}
