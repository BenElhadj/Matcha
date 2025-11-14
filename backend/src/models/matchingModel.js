const db = require('../config/database')

const getFollowing = async (user_id) => {
    const query = `SELECT matches.matched as matched_id, matches.created_at as match_date, users.username as username,
        (
            SELECT CASE
                WHEN i.link IS NOT NULL AND i.link != '' THEN i.link
                WHEN i.data IS NOT NULL AND i.data != '' THEN i.data
                WHEN i.base64 IS NOT NULL AND i.base64 != '' THEN i.base64
                ELSE ''
            END
            FROM images i
            WHERE i.user_id = matches.matched AND i.profile = true
            LIMIT 1
        ) as profile_image,
        (
            SELECT i.profile FROM images i WHERE i.user_id = matches.matched AND i.profile = true LIMIT 1
        ) as profile
    FROM matches
    INNER JOIN users ON matches.matched = users.id
    WHERE matches.matcher = $1`
    const result = await db.query(query, [user_id])
    return result.rows
}

const getFollowers = async (user_id) => {
    const query = `SELECT matches.matcher as matcher_id, matches.created_at as match_date, users.username as username,
        (
            SELECT CASE
                WHEN i.link IS NOT NULL AND i.link != '' THEN i.link
                WHEN i.data IS NOT NULL AND i.data != '' THEN i.data
                WHEN i.base64 IS NOT NULL AND i.base64 != '' THEN i.base64
                ELSE ''
            END
            FROM images i
            WHERE i.user_id = matches.matcher AND i.profile = true
            LIMIT 1
        ) as profile_image,
        (
            SELECT i.profile FROM images i WHERE i.user_id = matches.matcher AND i.profile = true LIMIT 1
        ) as profile
    FROM matches
    INNER JOIN users ON matches.matcher = users.id
    WHERE matches.matched = $1`
    const result = await db.query(query, [user_id])
    return result.rows
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
