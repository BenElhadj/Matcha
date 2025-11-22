// getReportedBy: retourne la liste paginée des utilisateurs qui m'ont signalé
const getReportedBy = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', message: 'Not logged in', data: null });
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 25;
	const offset = (page - 1) * limit;
	try {
		const items = await userModel.getReportedBy(req.user.id, limit, offset);
		// Pour le total, on fait un COUNT
		const countRes = await require('../config/database').query('SELECT COUNT(*) FROM reported WHERE reported = $1', [req.user.id]);
		const total = parseInt(countRes.rows[0].count, 10);
		return res.json({ page, limit, total, items });
	} catch (err) {
		return res.json({ status: 'error', message: 'Fatal error', data: String(err && err.message ? err.message : err) });
	}
};
// getReported: retourne la liste paginée des utilisateurs que j'ai signalés
const getReported = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', message: 'Not logged in', data: null });
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 25;
	const offset = (page - 1) * limit;
	try {
		const items = await userModel.getReported(req.user.id, limit, offset);
		// Pour le total, on fait un COUNT
		const countRes = await require('../config/database').query('SELECT COUNT(*) FROM reported WHERE reporter = $1', [req.user.id]);
		const total = parseInt(countRes.rows[0].count, 10);
		return res.json({ page, limit, total, items });
	} catch (err) {
		return res.json({ status: 'error', message: 'Fatal error', data: String(err && err.message ? err.message : err) });
	}
};
// getBlockedBy: retourne la liste paginée des utilisateurs qui ont bloqué l'utilisateur courant
const getBlockedBy = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', message: 'Not logged in', data: null });
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 25;
	const offset = (page - 1) * limit;
	try {
		const items = await userModel.getBlockedBy(req.user.id, limit, offset);
		// Pour le total, on fait un COUNT
		const countRes = await require('../config/database').query('SELECT COUNT(*) FROM blocked WHERE blocked = $1 AND type = \'block\'', [req.user.id]);
		const total = parseInt(countRes.rows[0].count, 10);
		return res.json({ page, limit, total, items });
	} catch (err) {
		return res.json({ status: 'error', message: 'Fatal error', data: String(err && err.message ? err.message : err) });
	}
};
const historyModel = require('../models/historyModel');

// getAllHistory: pagination SQL-native
const getAllHistory = async (req, res) => {
	if (!req.user.id)
		return res.json({ msg: 'not logged in' });
	try {
		const userId = req.user.id;
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;
		const offset = (page - 1) * limit;
		const type = (req.query.type || 'all').toString();
		const { rows, total } = await historyModel.getAllHistory(userId, offset, limit, type);
		return res.json({ page, limit, total, history: rows });
	} catch (err) {
		return res.json({ msg: 'Fatal error', err: String(err && err.message ? err.message : err) });
	}
};
// Dépendances modèles manquantes
const userModel = require('../models/userModel');
const tagsModel = require('../models/tagsModel');
const matchingModel = require('../models/matchingModel');

// showUsers: retourne la liste des utilisateurs (stub minimal)
const showUsers = async (req, res) => {
	try {
		const users = await userModel.getAllUsers ? await userModel.getAllUsers() : [];
		res.json(users);
	} catch (err) {
		res.json({ msg: 'Fatal error', err });
	}
};

// showUserById: retourne un utilisateur par id (stub minimal)
const showUserById = async (req, res) => {
	try {
		const id = req.params.id;
		const me = req.user && req.user.id ? Number(req.user.id) : null;
		const targetId = Number(id);
		// If requester is missing, deny
		if (!me) return res.json({ msg: 'not logged in' });
		// If either side blocked the other (type = 'block'), do not reveal the profile
		try {
			const iBlocked = await userModel.isBlocked(me, targetId);
			const blockedMe = await userModel.isBlocked(targetId, me);
			if (iBlocked || blockedMe) {
				// Keep the same frontend contract: presence of msg triggers redirect to /404
				return res.json({ msg: 'not found' });
			}
		} catch (e) {
			console.error('[showUserById] error checking block status', e && e.message ? e.message : e);
			// On DB error, be conservative and deny
			return res.json({ msg: 'not found' });
		}

		// getUserById returns rows; we need a single object and include images
		const rows = await userModel.getUserById ? await userModel.getUserById(id) : [];
		if (!rows || !rows.length) return res.json({ msg: 'not found' });
		const u = rows[0];
		// Compute rating using DB function get_rating(id)
		try {
			const db = require('../config/database')
			const rres = await db.query('SELECT get_rating($1) AS rating', [targetId])
			u.rating = rres && rres.rows && rres.rows[0] && typeof rres.rows[0].rating !== 'undefined' ? Number(rres.rows[0].rating) : 0
		} catch (e) {
			// If rating lookup fails, default to 0 but continue
			try { u.rating = Number(u.rating) || 0 } catch (_) { u.rating = 0 }
			console.error('[showUserById] failed to compute rating for user', id, e && e.message ? e.message : e)
		}
		try {
			// Attach all valid images (profile/cover/gallery) so frontend can pick profile & cover
			const images = await userModel.getImages ? await userModel.getImages(targetId) : [];
			u.images = images;
		} catch (e) {
			u.images = [];
			console.error('[showUserById] failed to load images for user', id, e && e.message ? e.message : e);
		}
		return res.json(u);
	} catch (err) {
		res.json({ msg: 'Fatal error', err });
	}
};

// getHistory: stub minimal pour éviter crash
const getHistory = async (req, res) => {
	res.json({ history: [] });
};
const notificationsModel = require('../models/notificationsModel');
// Fusionne les utilisateurs qui m'ont bloqué et ceux qui m'ont signalé (block/report)
const { getBlockedOrReportedBy } = require('../models/getBlockedOrReportedBy')

const getBlockedOrReportedByCtrl = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', message: 'Not logged in', data: null });
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 25;
	const offset = (page - 1) * limit;
	try {
		const items = await getBlockedOrReportedBy(req.user.id, limit, offset);
		// Compte total block + report
		const countRes = await db.query("SELECT COUNT(*) FROM blocked WHERE blocked = $1 AND (type = 'block' OR type = 'report')", [req.user.id]);
		const total = parseInt(countRes.rows[0].count, 10);
		return res.json({ page, limit, total, items });
	} catch (err) {
		return res.json({ status: 'error', message: 'Fatal error', data: String(err && err.message ? err.message : err) });
	}
};

// Get tags 

const getTags = async (req, res) => {
	console.log('[getTags] called, user:', req.user && req.user.id);
	if (!req.user || !req.user.id) {
		console.warn('[getTags] not logged in');
		return res.json({ msg: 'not logged in' });
	}
	try {
		const result = await tagsModel.getTags();
		console.log('[getTags] tags found:', result.length);
		return res.json(result.map(cur => cur.value));
	} catch (err) {
		console.error('[getTags] Fatal error:', err);
		return res.json({ msg: 'Fatal error', err });
	}
}

// get Blocked users 

const getBlocked = async (req, res) => {
	if (!req.user.id) {
		console.log('[getBlocked] Pas connecté');
		return res.json({ msg: 'not logged in' });
	}
	try {
		console.log('[getBlocked] req.user.id =', req.user.id);
		const blacklist = await userModel.getBlocked(req.user.id);
		console.log('[getBlocked] Résultat SQL =', blacklist);
		res.json(blacklist);
	} catch (err) {
		console.error('[getBlocked] Erreur fatale :', err);
		return res.json({ msg: 'Fatal error', err });
	}
}


// Get matches

const getMatches = async (req, res) => {
	if (!req.user.id)
		return res.json({ msg: 'not logged in' })
	try {
		// Important: ne pas dédupliquer ici pour préserver l'information directionnelle
		// attendue par le front (entries avec matched_id vs matcher_id)
		const following = await matchingModel.getFollowing(req.user.id)
		const followers = await matchingModel.getFollowers(req.user.id)
		// Retourner la concaténation brute: le front séparera suivant/suiveurs
		res.json([...following, ...followers])
	} catch (err) {
		return res.json({ msg: 'Fatal error', err })
	}
}

// const connectedUsers = {
// 	return  (connectedUsers)
// }


// Patch la route notifications pour harmoniser le mapping image
// Si notificationsModel expose une méthode getNotifAll, on la monkey-patch ici
if (notificationsModel && typeof notificationsModel.getNotifAll === 'function') {
	const origGetNotifAll = notificationsModel.getNotifAll;
	notificationsModel.getNotifAll = async function(...args) {
		const result = await origGetNotifAll.apply(this, args);
		let notifs = Array.isArray(result) ? result : (result.notifications || []);
		// Collecter tous les id_from pour batch fetch des images
		const idFroms = Array.from(new Set(notifs.map(n => n.id_from || n.from).filter(Boolean)));
		const imagesMap = await userModel.getImagesByUids(idFroms);
		for (let notif of notifs) {
			// 1. Essayer d'abord les champs existants (avatar, profile_image, cover)
			let val = null;
			const tryFields = [notif.avatar, notif.profile_image, notif.cover];
			for (let field of tryFields) {
				if (field && field !== 'false' && field !== '') {
					if (typeof field === 'string') {
						const s = field.trim();
						if (s.startsWith('http') || s.startsWith('data:image')) {
							val = s;
							break;
						}
						if (s.startsWith('/9j/')) {
							val = `data:image/jpeg;base64,${s}`;
							break;
						}
						if (s.startsWith('iVBOR')) {
							val = `data:image/png;base64,${s}`;
							break;
						}
						if (s.length > 100) {
							val = `data:image/jpeg;base64,${s}`;
							break;
						}
					}
				}
			}
			// 2. Si rien trouvé, aller chercher dans la table images
			if (!val) {
				const uid = notif.id_from || notif.from;
				const imgs = imagesMap[uid] || [];
				let profileImg = imgs.find(i => i.profile) || imgs[0];
				if (profileImg) {
					if (profileImg.link && profileImg.link !== 'false' && profileImg.link !== '') {
						val = profileImg.link;
					} else if (profileImg.data && profileImg.data !== 'false' && profileImg.data !== '') {
						const s = profileImg.data.trim();
						if (s.startsWith('data:image')) val = s;
						else if (s.startsWith('/9j/')) val = `data:image/jpeg;base64,${s}`;
						else if (s.startsWith('iVBOR')) val = `data:image/png;base64,${s}`;
						else if (s.length > 100) val = `data:image/jpeg;base64,${s}`;
					}
				}
			}
			notif.profile_image = val || null;
		}
		if (!Array.isArray(result) && result.notifications) {
			result.notifications = notifs;
			return result;
		}
		return notifs;
	};
}

module.exports = {
	showUsers,
	showUserById,
	getHistory,
	getTags,
	getBlocked,
	getMatches,
	getAllHistory,
	getBlockedBy,
	getReported,
	getReportedBy,
	getBlockedOrReportedByCtrl,
	discover
}

// New optimized Discover with pagination and server-side filters
async function discover(req, res) {
	try {
		const me = req.user
		if (!me || !me.id) return res.json({ msg: 'Not logged in' })

		// Parse query params
		const q = req.query || {}
		const page = Math.max(parseInt(q.page || '1', 10), 1)
		const limit = Math.min(Math.max(parseInt(q.limit || '50', 10), 1), 100)
		const onlineFirst = String(q.onlineFirst || '1') === '1'
		const gender = q.gender && q.gender !== 'all' ? String(q.gender) : null
		const search = q.search ? String(q.search).toLowerCase() : ''
		const ageMin = isFinite(q.ageMin) ? Number(q.ageMin) : 18
		const ageMax = isFinite(q.ageMax) ? Number(q.ageMax) : 85
		const hasRatingMin = Object.prototype.hasOwnProperty.call(q, 'ratingMin')
		const hasRatingMax = Object.prototype.hasOwnProperty.call(q, 'ratingMax')
		const ratingMin = isFinite(q.ratingMin) ? Number(q.ratingMin) : 0
		const ratingMax = isFinite(q.ratingMax) ? Number(q.ratingMax) : 10000
		const distanceMax = isFinite(q.distanceMax) ? Number(q.distanceMax) : 10000
		const lat = isFinite(q.lat) ? Number(q.lat) : me.lat
		const lng = isFinite(q.lng) ? Number(q.lng) : me.lng
		const tags = q.tags ? String(q.tags).split(',').filter(Boolean) : []
		const sortBy = q.sortBy || 'distance' // distance | age | rating | interests
		const sortDir = (q.sortDir || 'asc').toLowerCase() === 'desc' ? -1 : 1

		// Base dataset: users with profile image and computed rating
		// Note: getUserBrow already joins images.profile = TRUE and computes get_rating(users.id)
		let rows = await userModel.getUserBrow()

		// Filter out sensitive columns and shape base objects
		const isValid = (v) => v && v !== 'false' && String(v).trim() !== ''
		rows = rows.map((u) => {
			// profile image from images.* (link or data)
			let profile_image = ''
			try {
				if (isValid(u.link)) profile_image = u.link
				else if (isValid(u.data)) profile_image = `data:image/png;base64,${u.data}`
			} catch (_) {}
			// Compute ageYears server-side once
			let ageYears = 0
			try {
				const bd = u.birthdate ? new Date(u.birthdate) : null
				if (bd && !isNaN(bd)) {
					const diff = Date.now() - bd.getTime()
					ageYears = Math.abs(new Date(diff).getUTCFullYear() - 1970)
				}
			} catch (_) {}
			return {
				// Prefer images.user_id (FK) over images.id to ensure we reference the actual user id
				user_id: Number(u.user_id || u.id),
				username: u.username,
				first_name: u.first_name,
				last_name: u.last_name,
				gender: u.gender,
				birthdate: u.birthdate,
				ageYears,
				tags: u.tags || '',
				city: u.city,
				country: u.country,
				address: u.address,
				lat: Number(u.lat),
				lng: Number(u.lng),
				rating: Number(u.rating) || 0,
				profile_image
			}
		})

	// Exclude blocked both ways (type = 'block' ONLY)
	// me blocks others
	const blk1 = await db.query("SELECT blocked FROM blocked WHERE blocker = $1 AND type = 'block'", [me.id])
	const myBlockedSet = new Set(blk1.rows.map((r) => String(r.blocked)))
	// others block me
	const blk2 = await db.query("SELECT blocker FROM blocked WHERE blocked = $1 AND type = 'block'", [me.id])
	const blockedBySet = new Set(blk2.rows.map((r) => String(r.blocker)))
	rows = rows.filter((u) => !myBlockedSet.has(String(u.user_id)) && !blockedBySet.has(String(u.user_id)))
	// Exclude self
	rows = rows.filter((u) => String(u.user_id) !== String(me.id))

		// Filters
		if (gender) rows = rows.filter((u) => u.gender === gender)
		if (search) {
			rows = rows.filter((u) => {
				const s1 = (u.username || '').toLowerCase()
				const s2 = (u.first_name || '').toLowerCase()
				const s3 = (u.last_name || '').toLowerCase()
				return s1.includes(search) || s2.includes(search) || s3.includes(search)
			})
		}
		if (tags.length) {
			rows = rows.filter((u) => {
				if (!u.tags) return false
				const arr = String(u.tags).split(',')
				return tags.some((t) => arr.includes(t))
			})
		}
		// Distance compute on demand; memoize
		const meLoc = { lat: Number(lat), lng: Number(lng) }
		rows = rows.map((u) => {
			let d = 0
			try {
				if (isFinite(u.lat) && isFinite(u.lng) && isFinite(meLoc.lat) && isFinite(meLoc.lng)) {
					d = distance(meLoc, { lat: Number(u.lat), lng: Number(u.lng) })
				}
			} catch (_) {}
			return { ...u, distanceKm: d }
		})
		// Compute global maxima BEFORE applying specific filters
		const maxDistance = rows.length ? Math.ceil(rows.reduce((acc, u) => Math.max(acc, Number(u.distanceKm) || 0), 0)) : 0
		const maxRating = rows.length ? rows.reduce((acc, u) => Math.max(acc, Number(u.rating) || 0), 0) : 0
		// Now apply distance filter
		rows = rows.filter((u) => u.distanceKm >= 0 && u.distanceKm <= distanceMax)
		rows = rows.filter((u) => u.ageYears >= ageMin && u.ageYears <= ageMax)
		// Only apply rating filter if client explicitly provided rating bounds
		if (hasRatingMin || hasRatingMax) {
			rows = rows.filter((u) => u.rating >= ratingMin && u.rating <= ratingMax)
		}

		// Interests count for sort if needed
		const myTags = (me.tags || '').split(',')
		const interestsCount = (u) => {
			if (!u.tags) return 0
			const arr = String(u.tags).split(',')
			return myTags.filter((t) => arr.includes(t)).length
		}

		// Online-first using app-scoped Set
		let onlineIds = []
		if (onlineFirst) {
			try {
				const set = req.app.get('connectedUsers')
				if (set && typeof set.has === 'function') onlineIds = Array.from(set)
			} catch (_) {}
		}
		const onlineSet = new Set(onlineIds.map((x) => String(x)))

		// Sorting
		const cmp = (a, b) => {
			// Online first
			if (onlineFirst) {
				const ao = onlineSet.has(String(a.user_id)) ? 0 : 1
				const bo = onlineSet.has(String(b.user_id)) ? 0 : 1
				if (ao !== bo) return ao - bo
			}
			switch (sortBy) {
				case 'age':
					return sortDir * ((a.ageYears || 0) - (b.ageYears || 0))
				case 'rating':
					return sortDir * ((b.rating || 0) - (a.rating || 0))
				case 'interests':
					return sortDir * (interestsCount(b) - interestsCount(a))
				case 'distance':
				default:
					return sortDir * ((a.distanceKm || 0) - (b.distanceKm || 0))
			}
		}
		rows.sort(cmp)

		// Pagination
	const total = rows.length
		const start = (page - 1) * limit
		const items = rows.slice(start, start + limit)

		// Minimal payload; no heavy images array
		return res.json({ page, limit, total, maxDistance, maxRating, items })
	} catch (err) {
		return res.json({ msg: 'Fatal error', err: String(err && err.message ? err.message : err) })
	}
}