// Batch get user info by array of IDs
const getUsersByIds = async (ids) => {
    if (!ids || !ids.length) return [];
    const query = `SELECT * FROM users WHERE id = ANY($1)`;
    const result = await db.query(query, [ids]);
    return result.rows;
};

// Batch get images for multiple user IDs
const getImagesByUids = async (userIds) => {
    if (!userIds || !userIds.length) return [];
    const query = `SELECT *, COALESCE(link, '') AS link, COALESCE(data, '') AS data FROM images WHERE user_id = ANY($1)`;
    const result = await db.query(query, [userIds]);
    // Group by user_id
    const grouped = {};
    for (const img of result.rows) {
        if (!grouped[img.user_id]) grouped[img.user_id] = [];
        // Only valid images
        const validLink = img.link && img.link !== 'false' && img.link !== '' && img.link !== null && img.link !== undefined;
        const validData = img.data && img.data !== 'false' && img.data !== '' && img.data !== null && img.data !== undefined;
        if (validLink || validData) {
            grouped[img.user_id].push({
                ...img,
                image: validLink ? img.link : img.data
            });
        }
    }
    return grouped;
};
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
        WHERE blocked.blocked = $1 AND blocked.type = 'block'
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

// Optimized discover query: server-side filtering, distance calc, sorting and pagination
const getUsersForDiscover = async (opts = {}) => {
    // opts: { meId, lat, lng, distanceMax, ageMin, ageMax, ratingMin, ratingMax, hasRatingFilter, tags, search, gender, sortBy, sortDir, limit, offset }
    const {
        meId,
        lat,
        lng,
        distanceMax = 10000,
        ageMin = 18,
        ageMax = 85,
        ratingMin = 0,
        ratingMax = 10000,
        hasRatingFilter = false,
        tags = [],
        search = '',
        gender = null,
        sortBy = 'distance',
        sortDir = 1,
        limit = 50,
        offset = 0
    } = opts;

    const params = [];
    // We'll build WHERE clauses dynamically
    let where = `WHERE users.id IS NOT NULL`;
    // Exclude self
    params.push(meId);
    where += ` AND users.id <> $${params.length}`;

    // Gender
    if (gender) {
        params.push(gender);
        where += ` AND users.gender = $${params.length}`;
    }

    // Search
    if (search && search.trim().length) {
        params.push(`%${search.trim().toLowerCase()}%`);
        where += ` AND (LOWER(users.username) LIKE $${params.length} OR LOWER(users.first_name) LIKE $${params.length} OR LOWER(users.last_name) LIKE $${params.length})`;
    }

    // Age using SQL age() function
    params.push(ageMin);
    where += ` AND EXTRACT(YEAR FROM AGE(users.birthdate)) >= $${params.length}`;
    params.push(ageMax);
    where += ` AND EXTRACT(YEAR FROM AGE(users.birthdate)) <= $${params.length}`;

    // Rating
    if (hasRatingFilter) {
        params.push(ratingMin);
        where += ` AND get_rating(users.id) >= $${params.length}`;
        params.push(ratingMax);
        where += ` AND get_rating(users.id) <= $${params.length}`;
    }

    // Tags: at least one match
    if (tags && Array.isArray(tags) && tags.length) {
        const tagConds = [];
        for (const t of tags) {
            params.push(`%${t}%`);
            tagConds.push(`users.tags LIKE $${params.length}`);
        }
        if (tagConds.length) where += ` AND (${tagConds.join(' OR ')})`;
    }

    // Distance: compute using haversine; require lat/lng be present for the user
    // placeholders for lat/lng
    params.push(lat || 0);
    const latIdx = params.length;
    params.push(lng || 0);
    const lngIdx = params.length;

    // distance expression (km)
    // Cast stored lat/lng (possibly saved as varchar) to double precision and
    // guard against empty strings. This prevents Postgres from calling radians()
    // on character varying values which causes "function radians(character varying) does not exist".
    const distExpr = `(
        6371 * acos(
            cos(radians($${latIdx})) * cos(radians(CAST(NULLIF(users.lat, '') AS double precision))) * cos(radians(CAST(NULLIF(users.lng, '') AS double precision)) - radians($${lngIdx})) +
            sin(radians($${latIdx})) * sin(radians(CAST(NULLIF(users.lat, '') AS double precision)))
        )
    )`;

    // Exclude users without coords when distance filtering
    if (isFinite(distanceMax) && Number(distanceMax) < 100000) {
        params.push(distanceMax);
        // Ensure lat/lng are present and non-empty before attempting numeric casts
        where += ` AND users.lat IS NOT NULL AND users.lng IS NOT NULL AND users.lat <> '' AND users.lng <> '' AND ${distExpr} <= $${params.length}`;
    }

    // Build ORDER BY
    let orderBy = '';
    switch (sortBy) {
        case 'age':
            orderBy = `EXTRACT(YEAR FROM AGE(users.birthdate)) ${sortDir < 0 ? 'DESC' : 'ASC'}`;
            break;
        case 'rating':
            orderBy = `get_rating(users.id) ${sortDir < 0 ? 'DESC' : 'ASC'}`;
            break;
        case 'distance':
        default:
            orderBy = `${distExpr} ${sortDir < 0 ? 'DESC' : 'ASC'}`;
            break;
    }

    // Pagination
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    // Final query: compute distance, rating and include total via window
    const query = `SELECT users.id AS user_id, users.username, users.first_name, users.last_name, users.gender, users.birthdate, users.tags, users.city, users.country, users.address, users.lat, users.lng, COALESCE(images.link,'') AS link, COALESCE(images.data,'') AS data, get_rating(users.id) AS rating, ${distExpr} AS distance_km, COUNT(*) OVER() AS total FROM users LEFT JOIN images ON users.id = images.user_id AND images.profile = TRUE ${where} ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const result = await db.query(query, params);
    const rows = result.rows.map(u => ({
        user_id: Number(u.user_id),
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        gender: u.gender,
        birthdate: u.birthdate,
        ageYears: u.birthdate ? Number(new Date().getFullYear() - new Date(u.birthdate).getFullYear()) : 0,
        tags: u.tags || '',
        city: u.city,
        country: u.country,
        address: u.address,
        lat: Number(u.lat) || null,
        lng: Number(u.lng) || null,
        rating: Number(u.rating) || 0,
        profile_image: (u.link && u.link !== 'false' && u.link !== '') ? u.link : (u.data && u.data !== 'false' && u.data !== '' ? `data:image/png;base64,${u.data}` : ''),
        distanceKm: Number(u.distance_km) || 0
    }));

    const total = result.rows && result.rows[0] ? Number(result.rows[0].total) : 0;
    return { rows, total };
};

// GET User by id (browsing)
const getUserbyIdBrow = async (id, user_id) => {
        const query = `SELECT users.*, get_rating(users.id) AS rating
                FROM users
                WHERE id = $1
                    AND NOT EXISTS (
                        SELECT 1 FROM blocked
                        WHERE ((blocker = $2 AND blocked = $1) OR (blocker = $1 AND blocked = $2))
                            AND type = 'block'
                )`;
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
    // Only return rows where the relation is an actual 'block' (not 'report')
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
        WHERE blocked.blocker = $1 AND blocked.type = 'block'
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
            // can_view_profile is false when it's a real block; report-only entries are not returned here
            can_view_profile: false
        };
    });
}

// Get both blocked and reported users that I created (paginated)
const getBlockedOrReported = async (id, limit = 25, offset = 0) => {
    const query = `
        SELECT
            blocked.id AS block_row_id,
            blocked.blocked AS blocked_id,
            users.username, users.first_name, users.last_name, users.gender, users.birthdate,
            images.link, images.data, blocked.created_at, blocked.type AS type, get_rating(users.id) AS rating
        FROM blocked
        JOIN users ON blocked.blocked = users.id
        LEFT JOIN images ON users.id = images.user_id AND images.profile = TRUE
        WHERE blocked.blocker = $1 AND (blocked.type = 'block' OR blocked.type = 'report')
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
            block_row_id: row.block_row_id,
            id: row.block_row_id,
            blocked_id: row.blocked_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            gender: row.gender,
            birthdate: row.birthdate,
            avatar,
            blocked_at: row.created_at,
            type: row.type,
            can_view_profile: row.type === 'report',
            rating: row.rating
        };
    });
};

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
    // Return the rows representing reports *I* created.
    // Include the blocked table primary key as block_row_id so the frontend can unreport by id.
    const query = `
        SELECT 
            blocked.id AS block_row_id,
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
            // align shape with blocked mapping used by frontend: provide blocked_id and a row id
            block_row_id: row.block_row_id,
            id: row.block_row_id,
            blocked_id: row.reported_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            gender: row.gender,
            birthdate: row.birthdate,
            avatar,
            reported_at: row.created_at,
            type: 'report',
            can_view_profile: true,
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
    getReportedBy,
    getBlockedOrReported,
    getUsersByIds,
    getImagesByUids
    ,getUsersForDiscover
}
