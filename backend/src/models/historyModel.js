const db = require('../config/database')


// INSERT Into history [visits]

const insertHistory = async (user_id, id) => {
	// Vérifie s'il y a déjà une visite dans la dernière heure
	const checkQuery = `SELECT 1 FROM history WHERE visitor = $1 AND visited = $2 AND created_at > NOW() - INTERVAL '1 hour' LIMIT 1`;
	const check = await db.query(checkQuery, [user_id, id]);
	if (check.rows.length === 0) {
		const query = `INSERT INTO history (visitor, visited) VALUES ($1, $2)`;
		await db.query(query, [user_id, id]);
	}
}

/// Get Visitore History 

const getVisitors = async (user_id) => {
	const query = `SELECT
			history.visitor as visitor_id,
			history.created_at as visit_date,
			users.username as username,
			CASE 
				WHEN images.link IS NOT NULL THEN images.link
				WHEN images.data IS NOT NULL THEN CONCAT('data:image/png;base64,', images.data)
				ELSE ''
			END as profile_image
		FROM history
			INNER JOIN users 
			ON 
				history.visitor = users.id
			INNER JOIN images
			ON 
				history.visitor = images.user_id
			WHERE 
				history.visited = $1
			AND
				images.profile = TRUE`;
    const result = await db.query(query, [user_id]);
    return result.rows;
}

// Get visited History 

const getVisited = async (user_id) => {
	const query = `SELECT
			history.visited as visited_id,
			history.created_at as visit_date,
			users.username as username,
			CASE 
				WHEN images.link IS NOT NULL THEN images.link
				WHEN images.data IS NOT NULL THEN CONCAT('data:image/png;base64,', images.data)
				ELSE ''
			END as profile_image
		FROM history
			INNER JOIN users 
			ON 
				history.visited = users.id
			INNER JOIN images
			ON 
				history.visited = images.user_id
			WHERE 
				history.visitor = $1
			AND 
				images.profile = TRUE`;
    const result = await db.query(query, [user_id]);
    return result.rows;
}


const getAllHistory = async (user_id, offset = 0, limit = 20, type = 'all') => {
	// types that represent outgoing actions (user performed)
	const outgoingTypes = {
		like: ['like','you_like','he_like','like_back','you_like_back','he_like_back','unlike','you_unlike','he_unlike'],
		add_image: ['add_image','avatar_img','cover_img'],
		block: ['block','you_block','he_block','report','you_report','he_report']
	};

	// Helper to normalize image fields
	const normalizeImg = (link, data) => {
		if (link && link !== 'false' && link !== '') return link;
		if (data && data !== 'false' && data !== '') {
			const s = data.trim();
			if (s.startsWith('data:image')) return s;
			return `data:image/png;base64,${s}`;
		}
		return '';
	};

	// Fast path: only visits (already in history table)
	if (type === 'visit') {
		const query = `
			SELECT
				h.id,
				h.visitor as visitor_id,
				h.visited as visited_id,
				h.created_at as created_at,
				h.type,
				u.username,
				u.first_name,
				u.last_name,
				(SELECT link FROM images WHERE user_id = h.visited AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_link,
				(SELECT data FROM images WHERE user_id = h.visited AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_data
			FROM history h
			LEFT JOIN users u ON u.id = h.visited
			WHERE h.visitor = $1 AND h.type = 'visit'
			ORDER BY h.created_at DESC
			OFFSET $2 LIMIT $3
		`;
		const dataResult = await db.query(query, [user_id, offset, limit]);
		const countQ = `SELECT COUNT(*) FROM history WHERE visitor = $1 AND type = 'visit'`;
		const countRes = await db.query(countQ, [user_id]);
		return { rows: dataResult.rows.map(r => ({ id: r.id, visitor_id: r.visitor_id, his_id: r.visited_id, created_at: r.created_at, type: r.type, username: r.username, first_name: r.first_name, last_name: r.last_name, profile_image: normalizeImg(r.img_link, r.img_data) })), total: parseInt(countRes.rows[0].count, 10) };
	}

	// Otherwise we will aggregate from multiple sources (history, notifications, images, blocked)
	const pageWindow = offset + limit;
	const allRows = [];
	let totalCount = 0;

	// 1) history (outgoing visits) - include only when requested or for 'all'
	if (type === 'all') {
		const histQ = `
			SELECT h.id, h.visitor as visitor_id, h.visited as visited_id, h.created_at as created_at, h.type,
			       u.username, u.first_name, u.last_name,
			       (SELECT link FROM images WHERE user_id = h.visited AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_link,
			       (SELECT data FROM images WHERE user_id = h.visited AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_data
			FROM history h
			LEFT JOIN users u ON u.id = h.visited
			WHERE h.visitor = $1
			ORDER BY h.created_at DESC
			LIMIT $2
		`;
		const histRes = await db.query(histQ, [user_id, pageWindow]);
		const histCountRes = await db.query('SELECT COUNT(*) FROM history WHERE visitor = $1', [user_id]);
		totalCount += parseInt(histCountRes.rows[0].count, 10);
		for (const r of histRes.rows) allRows.push({ id: r.id, visitor_id: r.visitor_id, his_id: r.visited_id, created_at: r.created_at, type: r.type, username: r.username, first_name: r.first_name, last_name: r.last_name, profile_image: normalizeImg(r.img_link, r.img_data) });
	}

	// 2) likes/unlikes/like_back -> notifications table (actions performed by me)
	if (type === 'like' || type === 'all') {
		const likeTypesArr = outgoingTypes.like;
		const notifQ = `
			SELECT n.id, n.id_from, n.id_to, n.created_at as created_at, n.type,
			       u.username, u.first_name, u.last_name,
			       (SELECT link FROM images WHERE user_id = n.id_to AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_link,
			       (SELECT data FROM images WHERE user_id = n.id_to AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_data
			FROM notifications n
			LEFT JOIN users u ON u.id = n.id_to
			WHERE n.id_from = $1 AND n.type = ANY($2::text[])
			ORDER BY n.created_at DESC
			LIMIT $3
		`;
		const notifRes = await db.query(notifQ, [user_id, likeTypesArr, pageWindow]);
		const notifCountQ = `SELECT COUNT(*) FROM notifications WHERE id_from = $1 AND type = ANY($2::text[])`;
		const notifCountRes = await db.query(notifCountQ, [user_id, likeTypesArr]);
		totalCount += parseInt(notifCountRes.rows[0].count, 10);
		for (const r of notifRes.rows) allRows.push({ id: r.id, visitor_id: user_id, his_id: r.id_to, created_at: r.created_at, type: r.type, username: r.username, first_name: r.first_name, last_name: r.last_name, profile_image: normalizeImg(r.img_link, r.img_data) });
	}

	// 3) add_image -> images table (images I added)
	if (type === 'add_image' || type === 'all') {
		const imgQ = `
			SELECT i.id, i.user_id, i.created_at as created_at, i.link, i.data, i.profile, i.cover,
			       u.username, u.first_name, u.last_name,
			       (SELECT link FROM images WHERE user_id = i.user_id AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_link,
			       (SELECT data FROM images WHERE user_id = i.user_id AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_data
			FROM images i
			LEFT JOIN users u ON u.id = i.user_id
			WHERE i.user_id = $1
			ORDER BY i.created_at DESC
			LIMIT $2
		`;
		const imgRes = await db.query(imgQ, [user_id, pageWindow]);
		const imgCountRes = await db.query('SELECT COUNT(*) FROM images WHERE user_id = $1', [user_id]);
		totalCount += parseInt(imgCountRes.rows[0].count, 10);
		for (const r of imgRes.rows) {
			const imageNormalized = normalizeImg(r.link, r.data)
			let imageType = 'gallery'
			if (r.profile === true || r.profile === 't' || r.profile === '1') imageType = 'profile'
			else if (r.cover === true || r.cover === 't' || r.cover === '1') imageType = 'cover'
			allRows.push({
				id: r.id,
				visitor_id: user_id,
				his_id: user_id,
				created_at: r.created_at,
				type: 'add_image',
				username: r.username,
				added_type: imageType,
				added_image: imageNormalized,
				profile_image: normalizeImg(r.img_link, r.img_data)
			})
		}
	}

	// 4) block/report -> blocked table (actions I performed)
	if (type === 'block' || type === 'all') {
		const blkQ = `
			SELECT b.id, b.blocker, b.blocked, b.created_at as created_at, b.type,
			       u.username, u.first_name, u.last_name,
			       (SELECT link FROM images WHERE user_id = b.blocked AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_link,
			       (SELECT data FROM images WHERE user_id = b.blocked AND profile = TRUE ORDER BY id DESC LIMIT 1) as img_data
			FROM blocked b
			LEFT JOIN users u ON u.id = b.blocked
			WHERE b.blocker = $1 AND (b.type = 'block' OR b.type = 'report')
			ORDER BY b.created_at DESC
			LIMIT $2
		`;
		const blkRes = await db.query(blkQ, [user_id, pageWindow]);
		const blkCountRes = await db.query("SELECT COUNT(*) FROM blocked WHERE blocker = $1 AND (type = 'block' OR type = 'report')", [user_id]);
		totalCount += parseInt(blkCountRes.rows[0].count, 10);
		for (const r of blkRes.rows) allRows.push({ id: r.id, visitor_id: r.blocker, his_id: r.blocked, created_at: r.created_at, type: r.type, username: r.username, first_name: r.first_name, last_name: r.last_name, profile_image: normalizeImg(r.img_link, r.img_data) });
	}

	// Merge, sort and paginate
	allRows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
	const sliced = allRows.slice(offset, offset + limit);
	return { rows: sliced, total: totalCount };
};

module.exports = {
	insertHistory,
	getVisitors,
	getVisited,
	getAllHistory
}