// Get users who have blocked me (paginated)
const getBlockedBy = async (id, limit = 25, offset = 0) => {
    const query = `
        SELECT 
            blocked.blocker AS blocker_id, 
            users.username AS username, 
            users.first_name AS first_name, 
            users.last_name AS last_name, 
            users.gender AS gender, 
            users.birthdate AS birthdate, 
            images.link AS link, 
            images.data AS data, 
            blocked.created_at AS blocked_at, 
            get_rating(users.id) AS rating 
        FROM blocked 
        JOIN users ON blocked.blocker = users.id 
        LEFT JOIN images ON users.id = images.user_id AND images.profile = TRUE 
        WHERE blocked.blocked = $1
        ORDER BY blocked.created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [id, limit, offset]);
    const isValid = v => v && v !== 'false' && v !== '' && v !== null && v !== undefined;
    return result.rows.map(row => {
        let avatar = '';
        if (isValid(row.link)) {
            avatar = row.link;
        } else if (isValid(row.data)) {
            avatar = row.data;
        } else {
            avatar = '';
        }
        return {
            blocker_id: row.blocker_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            gender: row.gender,
            birthdate: row.birthdate,
            avatar,
            blocked_at: row.blocked_at,
            rating: row.rating
        };
    });
};
const db = require('../config/database')

// add user
const addUser = async (user) => {
    const query = `INSERT INTO users (first_name, last_name, username, email, password, vkey) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [user.first_name, user.last_name, user.username, user.email, user.password, user.vkey];
    const result = await db.query(query, values);
    return result.rows[0];
}

// Get user by Username / email 
const getUser = async (user) => {
    const query = `SELECT email, username FROM users WHERE username = $1 OR email = $2`;
    const values = [user.username, user.email];
    const result = await db.query(query, values);
    return result.rows;
}

const getUserByemail = async (email) => {
    const query = `SELECT email, username FROM users WHERE email = $1`;
    const result = await db.query(query, [email]);
    return result.rows;
}

// GET USERS FOR Browsing
const getUserBrow = async () => {
    const query = `SELECT users.*, images.*, get_rating(users.id) AS rating FROM users JOIN images ON users.id = images.user_id WHERE images.profile = TRUE ORDER BY rating DESC`;
    const result = await db.query(query);
    return result.rows;
}

// GET User by id (browsing)
const getUserbyIdBrow = async (id, user_id) => {
    const query = `SELECT users.*, get_rating(users.id) AS rating FROM users WHERE id = $1 AND id NOT IN (SELECT blocked FROM blocked WHERE blocker = $2 AND type = 'block') AND $2 NOT IN (SELECT blocked FROM blocked WHERE blocker = $1 AND type = 'block')`;
    const result = await db.query(query, [id, user_id]);
    return result.rows;
}

// Check Verif key 
const getVkey = async (vkey) => {
    const query = `SELECT verified, id FROM users WHERE vkey = $1`;
    const result = await db.query(query, [vkey]);
    return result.rows;
}

// Add Reset password key [rkey] ---- Using Email
const addRkey = async (user) => {
    const query = `UPDATE users SET rkey = $1 WHERE email = $2`;
    const result = await db.query(query, [user.rkey, user.email]);
    return result.rowCount > 0;
}

// Check Reset password key [rkey]
const getRkey = async (rkey) => {
    const query = `SELECT id FROM users WHERE rkey = $1`;
    const result = await db.query(query, [rkey]);
    return result.rows;
}

// Update password [After forgotten Email]
const changeFrogottenPassword = async (user) => {
    const query = `UPDATE users SET password = $1, rkey = '' WHERE id = $2 AND rkey = $3`;
    const result = await db.query(query, [user.password, user.id, user.rkey]);
    return result.rowCount;
}

// Destroy password key [rkey] ---- Using Email
const destroyRkey = async (id) => {
    const query = `UPDATE users SET rkey = '' WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rowCount;
}

// Validate an Email
const validateEmail = async (vkey) => {
    const query = `UPDATE users SET verified = TRUE, vkey = '' WHERE vkey = $1 AND verified = FALSE`;
    await db.query(query, [vkey]);
}

// Get user data by ID
const getUserById = async (id) => {
    const query = `SELECT * FROM users WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows;
}

const getUserByIdD = async (id) => {
    const query = `SELECT * FROM users WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows;
}

// Get user data by Username 
const getUserByUsername = async (username) => {
    const query = `SELECT * FROM users WHERE username = $1`;
    const result = await db.query(query, [username]);
    return result.rows;
}

// Get user by Username / email 
const getUserByIdentifier = async (identifier) => {
    const query = `SELECT * FROM users WHERE username = $1 OR email = $1`;
    const result = await db.query(query, [identifier]);
    return result.rows;
}

// Filling information for the 1st time 
const updateProfile = async (user) => {
    const query = `UPDATE users SET first_name = $1, last_name = $2, username = $3, email = $4, gender = $5, looking = $6, birthdate = $7, biography = $8, tags = $9, address = $10, city = $11, country = $12, postal_code = $13, phone = $14 WHERE id = $15`;
    const values = [user.first_name, user.last_name, user.username, user.email, user.gender, user.looking, user.birthdate, user.biography, user.tags, user.address, user.city, user.country, user.postal_code, user.phone, user.id];
    const result = await db.query(query, values);
    return result.rowCount;
}

// Update user Email 
const changeEmail = async (user) => {
    const query = `UPDATE users SET email = $1 WHERE id = $2`;
    const result = await db.query(query, [user.email, user.id]);
    return result.rowCount;
}

// Update Password 
const changePassword = async (user) => {
    const query = `UPDATE users SET password = $1 WHERE id = $2`;
    const result = await db.query(query, [user.password, user.id]);
    return result.rowCount;
}

// Get images
const isValidImage = (img) => {
    const validLink = img.link && img.link !== 'false' && img.link !== '' && img.link !== null && img.link !== undefined;
    const validData = img.data && img.data !== 'false' && img.data !== '' && img.data !== null && img.data !== undefined;
    return validLink || validData;
};

const getImages = async (id) => {
    // Correction : retourner toutes les images de l'utilisateur (profil, cover, galerie)
    const query = `SELECT *, COALESCE(link, '') AS link, COALESCE(data, '') AS data FROM images WHERE user_id = $1`;
    const result = await db.query(query, [id]);
    return result.rows.filter(isValidImage).map(img => ({
        ...img,
        image: img.link ? img.link : img.data
    }));
}

// Get image By Id (pour suppression, retourne même les images corrompues ou vides)
const getImagesById = async (id, user_id) => {
    const query = `SELECT *, COALESCE(link, '') AS link, COALESCE(data, '') AS data FROM images WHERE id = $1 AND user_id = $2`;
    const result = await db.query(query, [id, user_id]);
    return result.rows.map(img => ({
        ...img,
        image: img.link ? img.link : img.data
    }));
}

// Get image by userid
const getImagesByUid = async (user_id) => {
    const query = `SELECT *, COALESCE(link, '') AS link, COALESCE(data, '') AS data FROM images WHERE user_id = $1`;
    const result = await db.query(query, [user_id]);
    return result.rows.filter(isValidImage).map(img => ({
        ...img,
        image: img.link ? img.link : img.data
    }));
}

// Add images 
const insertImages = async (user) => {
    // Par défaut, image de galerie (profile=0, cover=0)
    // Accepts either link (URL) or data (base64)
    // Conversion robuste des booléens (accepte true, 'true', 1, '1')
    const toBool = v => v === true || v === 1 || v === '1' || v === 'true';
    const profile = toBool(user.profile) ? 1 : 0;
    const cover = toBool(user.cover) ? 1 : 0;
    const query = `INSERT INTO images (user_id, link, data, profile, cover) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await db.query(query, [user.id, user.link || null, user.data || null, profile, cover]);
    return result.rows[0];
}

// Update profile pic to 0
const updateProfilePic = async (id) => {
    const query = `UPDATE images SET profile = 0 WHERE user_id = $1`;
    await db.query(query, [id]);
}

// Get cover photo
const getCover = async (id) => {
    // Correction : utiliser true pour cover (type BOOLEAN en SQL)
    const query = `SELECT *, COALESCE(link, '') AS link, COALESCE(data, '') AS data FROM images WHERE cover = true AND user_id = $1`;
    const result = await db.query(query, [id]);
    return result.rows.map(img => ({
        ...img,
        image: img.link ? img.link : img.data
    }));
}

// Delete cover photo 
const delCover = async (id, user_id) => {
    const query = `DELETE FROM images WHERE id = $1 AND user_id = $2`;
    await db.query(query, [id, user_id]);
}

// INSERT Cover photo
const insertCover = async (user_id, imgName) => {
    // Accepts either link (URL) or data (base64) for cover image
    const query = `INSERT INTO images (user_id, link, data, cover) VALUES ($1, $2, $3, 1) RETURNING *`;
    const result = await db.query(query, [user_id, arguments[1] || null, arguments[2] || null]);
    return result.rows[0];
}

// DELETE images 
const delImage = async (id, user_id) => {
    const query = `DELETE FROM images WHERE id = $1 AND user_id = $2`;
    const result = await db.query(query, [id, user_id]);
    console.log(`[BACKEND][delImage] Suppression image id=${id}, user_id=${user_id}, lignes supprimées:`, result.rowCount);
    return result.rowCount;
}

// Set profile pic To 1 and Cover to 0
const setImages = async (user_id) => {
    const query = `UPDATE images SET profile = 1 WHERE user_id = $1 AND cover = 0`;
    await db.query(query, [user_id]);
}

// get Blocked  users 
const getBlocked = async (id) => {
    const query = `
        SELECT 
            blocked.id AS block_row_id,
            blocked.blocked AS blocked_id, 
            users.username AS username, 
            users.first_name AS first_name, 
            users.last_name AS last_name, 
            users.gender AS gender, 
            users.birthdate AS birthdate, 
            images.link AS link, 
            images.data AS data, 
            blocked.created_at AS blocked_at, 
            blocked.type AS type, 
            get_rating(users.id) AS rating 
        FROM blocked 
        JOIN users ON blocked.blocked = users.id 
        LEFT JOIN images ON users.id = images.user_id AND images.profile = TRUE 
        WHERE blocked.blocker = $1
        ORDER BY blocked.created_at DESC
    `;
    const result = await db.query(query, [id]);
    // On applique la même logique que le frontend pour choisir l'avatar
    const isValid = v => v && v !== 'false' && v !== '' && v !== null && v !== undefined;
    return result.rows.map(row => {
        let avatar = '';
        if (isValid(row.link)) {
            avatar = row.link;
        } else if (isValid(row.data)) {
            avatar = row.data;
        } else {
            avatar = '';
        }
        return {
            block_row_id: row.block_row_id,
            blocked_id: row.blocked_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            gender: row.gender,
            birthdate: row.birthdate,
            avatar,
            blocked_at: row.blocked_at,
            type: row.type,
            rating: row.rating,
            can_view_profile: row.type === 'report' ? true : false
        };
    });
}

// Check if a specific user is already blocked by the current user
const isBlocked = async (blocker, blocked) => {
    const query = `SELECT 1 FROM blocked WHERE blocker = $1 AND blocked = $2 AND type = 'block'`;
    const result = await db.query(query, [blocker, blocked]);
    return result.rowCount > 0;
}

// ...existing code...

// Block user (type = 'block')
const blockUser = async (user_id, id) => {
    const query = `INSERT INTO blocked (blocker, blocked, type) VALUES ($1, $2, 'block') ON CONFLICT DO NOTHING`;
    await db.query(query, [user_id, id]);
}

// Report user (type = 'report')
const reportUser = async (user_id, id) => {
    console.log('[MODEL] reportUser called', { user_id, id });
    const query = `INSERT INTO blocked (blocker, blocked, type) VALUES ($1, $2, 'report')`;
    await db.query(query, [user_id, id]);
}
// Supprimer un report (type = 'report') par id unique
const unreportUser = async (user_id, block_row_id) => {
    const query = `DELETE FROM blocked WHERE id = $1 AND blocker = $2 AND type = 'report'`;
    await db.query(query, [block_row_id, user_id]);
};

// Unblock user (type = 'block')
const unblockUser = async (user_id, id) => {
    const query = `DELETE FROM blocked WHERE blocker = $1 AND blocked = $2 AND type = 'block'`;
    const result = await db.query(query, [user_id, id]);
    return result.rowCount;
};

// Get users I have reported (paginated)
const getReported = async (id, limit = 25, offset = 0) => {
    const query = `
        SELECT 
            blocked.blocked AS reported_id, 
            users.username, users.first_name, users.last_name, users.gender, users.birthdate, images.link, images.data, blocked.created_at, get_rating(users.id) AS rating
        FROM blocked 
        JOIN users ON blocked.blocked = users.id 
        LEFT JOIN images ON users.id = images.user_id AND images.profile = TRUE 
        WHERE blocked.blocker = $1 AND blocked.type = 'report'
        ORDER BY blocked.created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [id, limit, offset]);
    const isValid = v => v && v !== 'false' && v !== '' && v !== null && v !== undefined;
    return result.rows.map(row => {
        let avatar = '';
        if (isValid(row.link)) avatar = row.link;
        else if (isValid(row.data)) avatar = row.data;
        return {
            reported_id: row.reported_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            gender: row.gender,
            birthdate: row.birthdate,
            avatar,
            reported_at: row.created_at,
            rating: row.rating
        };
    });
};

// Get users who have reported me (paginated)
const getReportedBy = async (id, limit = 25, offset = 0) => {
    const query = `
        SELECT 
            blocked.blocker AS reporter_id, 
            users.username, users.first_name, users.last_name, users.gender, users.birthdate, images.link, images.data, blocked.created_at, get_rating(users.id) AS rating
        FROM blocked 
        JOIN users ON blocked.blocker = users.id 
        LEFT JOIN images ON users.id = images.user_id AND images.profile = TRUE 
        WHERE blocked.blocked = $1 AND blocked.type = 'report'
        ORDER BY blocked.created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [id, limit, offset]);
    const isValid = v => v && v !== 'false' && v !== '' && v !== null && v !== undefined;
    return result.rows.map(row => {
        let avatar = '';
        if (isValid(row.link)) avatar = row.link;
        else if (isValid(row.data)) avatar = row.data;
        return {
            reporter_id: row.reporter_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            gender: row.gender,
            birthdate: row.birthdate,
            avatar,
            reported_at: row.created_at,
            rating: row.rating
        };
    });
};

// User update location 
const updateLocation = async (lat, long, id) => {
    const query = `UPDATE users SET lat = $1, lng = $2 WHERE id = $3`;
    await db.query(query, [lat, long, id]);
    return await db.query(query, [lat, long, id]);
}

const blacklist = async (ids) => {
    const query = `SELECT id, username, first_name, last_name FROM users WHERE id = ANY($1)`;
    const result = await db.query(query, [ids]);
    return result.rows;
}

const updateStatus = async (id, status) => {
    const query = `UPDATE users SET status = $2 WHERE id = $1`;
    await db.query(query, [id, status]);
}

module.exports = {
    addUser,
    getUser,
    getVkey,
    validateEmail,
    getUserByIdentifier,
    getUserById,
    getUserByUsername,
    getUserByemail,
    getRkey,
    addRkey,
    destroyRkey,
    changeFrogottenPassword,
    updateProfile,
    changeEmail,
    getUserByIdD,
    changePassword,
    insertImages,
    getImages,
    updateProfilePic,
    getCover,
    delCover,
    insertCover,
    getImagesById,
    delImage,
    setImages,
    getImagesByUid,
    getUserBrow,
    getUserbyIdBrow,
    getBlocked,
    isBlocked,
    blockUser,
    unblockUser,
    reportUser,
        unreportUser,
    updateLocation,
    updateStatus,
    blacklist,
    getBlockedBy,
    getReported,
    getReportedBy
}
