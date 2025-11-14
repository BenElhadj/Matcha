const db = require('../config/database')

const getFollowing = async (user_id) => {
    const query = `SELECT matches.matched as matched_id, matches.created_at as match_date, users.username as username, images.link, images.data, images.profile as profile FROM matches INNER JOIN users ON matches.matched = users.id LEFT JOIN images ON matches.matched = images.user_id AND images.profile = true WHERE matches.matcher = $1`
    const result = await db.query(query, [user_id])
    // Correction: profile_image = data:image/png;base64,... si data existe, sinon link, sinon ''
    return result.rows.map(row => {
        let profile_image = '';
        if (row.data && row.data !== 'false' && row.data !== '') {
            profile_image = row.data.startsWith('data:image') ? row.data : `data:image/png;base64,${row.data}`;
        } else if (row.link && row.link !== 'false' && row.link !== '') {
            profile_image = row.link;
        }
        return {
            matched_id: row.matched_id,
            match_date: row.match_date,
            username: row.username,
            profile_image,
            profile: row.profile
        };
    });
}

const getFollowers = async (user_id) => {
    const query = `SELECT matches.matcher as matcher_id, matches.created_at as match_date, users.username as username, images.link, images.data, images.profile as profile FROM matches INNER JOIN users ON matches.matcher = users.id LEFT JOIN images ON matches.matcher = images.user_id AND images.profile = true WHERE matches.matched = $1`
    const result = await db.query(query, [user_id])
    // Correction: profile_image = data:image/png;base64,... si data existe, sinon link, sinon ''
    return result.rows.map(row => {
        let profile_image = '';
        if (row.data && row.data !== 'false' && row.data !== '') {
            profile_image = row.data.startsWith('data:image') ? row.data : `data:image/png;base64,${row.data}`;
        } else if (row.link && row.link !== 'false' && row.link !== '') {
            profile_image = row.link;
        }
        return {
            matcher_id: row.matcher_id,
            match_date: row.match_date,
            username: row.username,
            profile_image,
            profile: row.profile
        };
    });
}

const insertMatche = async (user1, user2) => {
    const query = `INSERT INTO matches (matcher, matched) VALUES ($1::integer, $2::integer)`
    await db.query(query, [parseInt(user1, 10), parseInt(user2, 10)])
}

const delMatche = async (user_id, id) => {
    const query = `DELETE FROM matches WHERE (matcher = $1 AND matched = $2) OR (matcher = $2 AND matched = $1)`
    await db.query(query, [user_id, id])
}

const getMatche = async (user_id, id) => {
    const query = `SELECT * FROM matches WHERE matcher = $1 AND matched = $2`
    const result = await db.query(query, [user_id, id])
    return result.rows
}

module.exports = {
    getFollowing,
    getFollowers,
    insertMatche,
    delMatche,
    getMatche
}