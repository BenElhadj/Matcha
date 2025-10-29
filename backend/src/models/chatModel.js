const db = require('../config/database')

// Get conversation 

const getConv = async (user_id , id) => {
    const query = `SELECT * FROM conversations WHERE (id_user1 = $1 AND id_user2 = $2) OR (id_user2 = $1 AND id_user1 = $2)`;
    const result = await db.query(query, [user_id, id]);
    return result.rows;
}

// Insert new conv 

const insertConv = async (user1, user2) => {
    const query = `INSERT INTO conversations (id_user1, id_user2) VALUES ($1, $2) RETURNING *`;
    const result = await db.query(query, [user1, user2]);
    return result.rows[0];
}

// Set Conv Allowed 

const disallowConv = async (user_id, id) => {
    const query = `UPDATE conversations SET allowed = FALSE WHERE (id_user1 = $1 AND id_user2 = $2) OR (id_user2 = $1 AND id_user1 = $2)`;
    await db.query(query, [user_id, id]);
}

// Set Conv unallowed 

const allowConv = async (conv_id) => {
    const query = `UPDATE conversations SET allowed = TRUE WHERE id_conversation = $1`;
    await db.query(query, [conv_id]);
}


// DELETE conv 

const delConv = async (id1, id2) => {
    const query = `DELETE FROM chat WHERE id_conversation IN (SELECT id_conversation FROM conversations WHERE (id_user1 = $1 AND id_user2 = $2) OR (id_user1 = $2 AND id_user2 = $1))`;
    await db.query(query, [id1, id2]);
}

// get Chat for other users ((ALLLL ))


const getConvAll = async (user1) => {
    // Requête UNION pour récupérer toutes les conversations où user1 est id_user1 ou id_user2
    // et les trier par dernière mise à jour (plus récentes en premier)
    const query = `
        SELECT * FROM (
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
        ) as conv
        ORDER BY conv.last_update DESC NULLS LAST
    `;
    const result = await db.query(query, [user1]);
    return result.rows;
}

// Get chat messages for a conversation, paginated (50 per page)
const getChat = async (id, offset) => {
    const query = `SELECT * FROM chat WHERE id_conversation = $1 ORDER BY created_at DESC OFFSET $2 LIMIT 50`;
    const result = await db.query(query, [id, offset]);
    return result.rows;
}

// Mark all messages as seen for a conversation, except those sent by the current user
const seenMsg = async (id_conv, id_from) => {
    const query = `UPDATE chat SET is_read = TRUE WHERE id_conversation = $1 AND id_from != $2`;
    await db.query(query, [id_conv, id_from]);
}

// Get conversation by id and user ids
const getConversation = async (id_conv, id1, id2) => {
    const query = `SELECT * FROM conversations WHERE id_conversation = $1 AND (id_user1 = $2 OR id_user2 = $3)`;
    const result = await db.query(query, [id_conv, id1, id2]);
    return result.rows;
}

// Insert a new message
const insertMsg = async (msg) => {
    // Ensure is_read is a boolean if present, else default to false
    const query = `INSERT INTO chat (id_conversation, id_from, message, created_at, is_read) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const isRead = typeof msg.is_read === 'boolean' ? msg.is_read : false;
    const values = [msg.id_conversation, msg.id_from, msg.message, msg.date, isRead];
    const result = await db.query(query, values);
    return result.rows[0];
}

// Update conversation last_update and last_msg
const updateConv = async (date, insertID, id_conv) => {
    const query = `UPDATE conversations SET last_update = $1, last_msg = $2 WHERE id_conversation = $3`;
    await db.query(query, [date, insertID, id_conv]);
}

module.exports = {
    getConv,
    insertConv,
    allowConv,
    disallowConv,
    delConv,
    getConvAll,
    getChat,
    seenMsg,
    getConversation,
    insertMsg,
    updateConv,
    // Return conversations that have unread messages for this user
    getInChat: async (userId) => {
        const q = `SELECT DISTINCT id_conversation FROM chat WHERE id_from != $1 AND is_read = FALSE`;
        const res = await db.query(q, [userId]);
        return res.rows;
    },
    // Return counts of not-seen messages per conversation for this user
    getNotSeenMsgModel: async (userId) => {
        const q = `
            SELECT id_conversation, COUNT(*)::int AS count
            FROM chat
            WHERE id_from != $1 AND is_read = FALSE
            GROUP BY id_conversation
        `;
        const res = await db.query(q, [userId]);
        return res.rows;
    }
}