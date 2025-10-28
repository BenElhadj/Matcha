const db = require('../config/database')

const insertNotifVis = async (user_id, id) => {
    const query = `INSERT INTO notifications (type, id_from, id_to) VALUES ('visit', $1, $2)`
    await db.query(query, [user_id, id])
}

const insertNotif = async (type, user_id, id) => {
    const query = `INSERT INTO notifications (type, id_from, id_to) VALUES ($1::text, $2, $3)`
    await db.query(query, [type, user_id, id])
}

const delNotif = async (id, user_id) => {
    const query = `DELETE FROM notifications WHERE (id_from = $1 AND id_to = $2) OR (id_from = $2 AND id_to = $1)`
    await db.query(query, [id, user_id])
}

const insertNotifConv = async (type, id_from, id_to, id_conversation) => {
    const query = `INSERT INTO notifications (type, id_from, id_to, id_conversation) VALUES ($1::text, $2, $3, $4)`
    await db.query(query, [type, id_from, id_to, id_conversation])
}

// Get latest notification per sender for a user, with pagination.
// Uses a subquery to pick the most recent notification per id_from,
// joins the profile image (images.profile = TRUE) and users while
// excluding blocked users. Returns rows ordered by notification date desc.
const getNotif = async (id, limit = 50, offset = 0, includeBlocked = false) => {
        const query = includeBlocked ? `
    SELECT n.id, n.id_from, n.date, n.is_read, n.type, u.username, i.link as profile_image, i.profile, i.cover
        FROM (
            SELECT DISTINCT ON (id_from) id, id_from, created_at as date, is_read, type, id_conversation
            FROM notifications
            WHERE id_to = $1
            ORDER BY id_from, created_at DESC
        ) n
        LEFT JOIN users u ON n.id_from = u.id
        LEFT JOIN images i ON n.id_from = i.user_id AND i.profile = TRUE
        ORDER BY n.date DESC
        LIMIT $2 OFFSET $3
        ` : `
    SELECT n.id, n.id_from, n.date, n.is_read, n.type, u.username, i.link as profile_image, i.profile, i.cover
        FROM (
            SELECT DISTINCT ON (id_from) id, id_from, created_at as date, is_read, type, id_conversation
            FROM notifications
            WHERE id_to = $1
            ORDER BY id_from, created_at DESC
        ) n
        LEFT JOIN users u ON n.id_from = u.id
        LEFT JOIN images i ON n.id_from = i.user_id AND i.profile = TRUE
        WHERE n.id_from NOT IN (
            SELECT blocker FROM blocked WHERE blocked = $1
            UNION
            SELECT blocked FROM blocked WHERE blocker = $1
        )
        ORDER BY n.date DESC
        LIMIT $2 OFFSET $3
        `
        const result = await db.query(query, [id, limit, offset])
        return result.rows
}

// Get ALL notifications for a user (no collapsing), with pagination.
const getNotifAll = async (id, limit = 50, offset = 0, includeBlocked = false) => {
                                const query = includeBlocked ? `
                                SELECT n.id, n.id_from, n.created_at as date, n.is_read, n.type, u.username,
                                                         i.link as profile_image, i.profile, i.cover
                                FROM notifications n
                                LEFT JOIN users u ON n.id_from = u.id
                                LEFT JOIN images i ON n.id_from = i.user_id AND i.profile = TRUE
                                WHERE n.id_to = $1
                                ORDER BY n.created_at DESC
                                LIMIT $2 OFFSET $3
                                ` : `
                                SELECT n.id, n.id_from, n.created_at as date, n.is_read, n.type, u.username,
                                                         i.link as profile_image, i.profile, i.cover
                                FROM notifications n
                                LEFT JOIN users u ON n.id_from = u.id
                                LEFT JOIN images i ON n.id_from = i.user_id AND i.profile = TRUE
                                WHERE n.id_to = $1
                                    AND n.id_from NOT IN (
                                                SELECT blocker FROM blocked WHERE blocked = $1
                                                UNION
                                                SELECT blocked FROM blocked WHERE blocker = $1
                                    )
                                ORDER BY n.created_at DESC
                                LIMIT $2 OFFSET $3
                                `
                const result = await db.query(query, [id, limit, offset])
                return result.rows
}

const seenOneNotif = async (id_from, id_to) => {
    const query = `UPDATE notifications SET is_read = TRUE WHERE id_to = $1 AND id_from = $2`
    await db.query(query, [id_to, id_from])
}

const seenNotif = async (id) => {
    const query = `UPDATE notifications SET is_read = TRUE WHERE type != 'chat' AND id_to = $1`
    await db.query(query, [id])
}

const seenMsgNotif = async (conv_id, id_from) => {
    const query = `UPDATE notifications SET is_read = TRUE WHERE type = 'chat' AND id_conversation = $1 AND id_from != $2`
    await db.query(query, [conv_id, id_from])
}

module.exports = {
    insertNotifVis,
    insertNotif,
    delNotif,
    insertNotifConv,
    getNotif,
    getNotifAll,
    seenOneNotif,
    seenNotif,
    seenMsgNotif,
    // Debug/metrics helpers
    countAllNotif: async (id) => {
        const q = `SELECT COUNT(*)::int AS count FROM notifications WHERE id_to = $1`;
        const res = await db.query(q, [id]);
        return res.rows?.[0]?.count || 0;
    },
        countAllNotifFiltered: async (id) => {
                const q = `
                        SELECT COUNT(*)::int AS count
                        FROM notifications n
                        WHERE n.id_to = $1
                            AND n.id_from NOT IN (
                                SELECT blocker FROM blocked WHERE blocked = $1
                                UNION
                                SELECT blocked FROM blocked WHERE blocker = $1
                            )
                `;
        const res = await db.query(q, [id]);
        return res.rows?.[0]?.count || 0;
    }
}
