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

const getAllHistory = async (user_id, offset = 0, limit = 20) => {
		// Requête robuste : prend la dernière image de profil (link ou data), gère tous les cas
		const query = `
			SELECT
				h.id,
				h.visitor as his_id,
				h.visited as user_id,
				h.created_at as match_date,
				h.type,
				u.username,
				u.first_name,
				u.last_name,
				CASE 
					WHEN img.link IS NOT NULL AND img.link <> 'false' AND img.link <> '' THEN img.link
					WHEN img.data IS NOT NULL AND img.data <> '' AND img.data <> 'false' THEN 
						CASE 
							WHEN img.data LIKE 'data:image%' THEN img.data
							ELSE CONCAT('data:image/png;base64,', img.data)
						END
					ELSE ''
				END as profile_image
			FROM history h
			INNER JOIN users u ON h.visitor = u.id
			LEFT JOIN LATERAL (
				SELECT * FROM images 
				WHERE user_id = h.visitor AND profile = TRUE 
				ORDER BY id DESC LIMIT 1
			) img ON true
			WHERE h.visited = $1
			ORDER BY h.created_at DESC
			OFFSET $2 LIMIT $3
		`;
		const dataResult = await db.query(query, [user_id, offset, limit]);
		// Get total count for pagination
		const countResult = await db.query('SELECT COUNT(*) FROM history WHERE visited = $1', [user_id]);
		return { rows: dataResult.rows, total: parseInt(countResult.rows[0].count, 10) };
};

module.exports = {
	insertHistory,
	getVisitors,
	getVisited,
	getAllHistory
}