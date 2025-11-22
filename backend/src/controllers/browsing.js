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
const notificationsModel = require('../models/notificationsModel');

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
// Database client and utilities used by discover
const db = require('../config/database')
const distance = require('../utility/distance')

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

		// Record the visit in history (1 hour window) and notify the visited user (visit notification) if applicable
		try {
			await historyModel.insertHistory(me, targetId).catch(() => {});
			await notificationsModel.insertNotifVis(me, targetId).catch(() => {});
		} catch (e) {
			// non-fatal
			console.error('[showUserById] history/notification insert error', e && e.message ? e.message : e);
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
	const page = parseInt(req.query.page, 10) || 1;
	const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
	const offset = (page - 1) * limit;
	try {
		console.log('[getBlocked] req.user.id =', req.user.id, 'page=', page, 'limit=', limit);
		// Use the new paginated model helper to fetch both block+report entries I created
		const items = await userModel.getBlockedOrReported(req.user.id, limit, offset).catch(() => []);
		// Count total combined
		const countRes = await db.query("SELECT COUNT(*) FROM blocked WHERE blocker = $1 AND (type = 'block' OR type = 'report')", [req.user.id]);
		const total = parseInt(countRes.rows[0].count, 10);
		return res.json({ page, limit, total, items });
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

		// Use optimized model query which performs filtering, distance calc and pagination in SQL
		const hasRatingFilter = hasRatingMin || hasRatingMax
		const opts = {
			meId: me.id,
			lat,
			lng,
			distanceMax,
			ageMin,
			ageMax,
			ratingMin,
			ratingMax,
			hasRatingFilter,
			tags,
			search,
			gender,
			sortBy,
			sortDir,
			limit,
			offset
		}

		const { rows: fetchedRows, total } = await userModel.getUsersForDiscover(opts)
		let rows = fetchedRows || []

		// Exclude blocked both ways (type = 'block' ONLY)
		const blk1 = await db.query("SELECT blocked FROM blocked WHERE blocker = $1 AND type = 'block'", [me.id])
		const myBlockedSet = new Set(blk1.rows.map((r) => String(r.blocked)))
		// others block me
		const blk2 = await db.query("SELECT blocker FROM blocked WHERE blocked = $1 AND type = 'block'", [me.id])
		const blockedBySet = new Set(blk2.rows.map((r) => String(r.blocker)))
		rows = rows.filter((u) => !myBlockedSet.has(String(u.user_id)) && !blockedBySet.has(String(u.user_id)))

		// Compute server-side maxima from fetched slice (best-effort)
		const maxDistance = rows.length ? Math.ceil(rows.reduce((acc, u) => Math.max(acc, Number(u.distanceKm) || 0), 0)) : distanceMax
		const maxRating = rows.length ? rows.reduce((acc, u) => Math.max(acc, Number(u.rating) || 0), 0) : 0

		// Items are already paginated by SQL
		let items = rows

		// --- Enrich ordering: onlineFirst, then friends, then invitations received, then invitations sent, then others
		try {
			// get online set (may be undefined)
			const onlineSet = new Set((req.app.get('connectedUsers') || []).map(x => String(x)));
			// get following (who I invited) and followers (who invited me)
			const followingRows = await matchingModel.getFollowing(me.id).catch(() => []);
			const followersRows = await matchingModel.getFollowers(me.id).catch(() => []);
			const followingSet = new Set((followingRows || []).map(r => String(r.matched_id || r.matched_id)));
			const followersSet = new Set((followersRows || []).map(r => String(r.matcher_id || r.matcher_id)));
			const friendsSet = new Set(Array.from(followingSet).filter(x => followersSet.has(x)));

			// Preserve original order from SQL by tagging index
			items = items.map((it, idx) => ({ ...it, _origIndex: idx }));

			items.sort((a, b) => {
				// onlineFirst grouping
				if (onlineFirst) {
					const ao = onlineSet.has(String(a.user_id)) ? 0 : 1;
					const bo = onlineSet.has(String(b.user_id)) ? 0 : 1;
					if (ao !== bo) return ao - bo;
				}
				const uidA = String(a.user_id);
				const uidB = String(b.user_id);
				const prio = (uid) => {
					if (friendsSet.has(uid)) return 0;
					if (followersSet.has(uid) && !followingSet.has(uid)) return 1; // invitation received
					if (followingSet.has(uid) && !followersSet.has(uid)) return 2; // invitation sent
					return 3; // normal
				}
				const pa = prio(uidA);
				const pb = prio(uidB);
				if (pa !== pb) return pa - pb;
				// fallback to original SQL order
				return (a._origIndex || 0) - (b._origIndex || 0);
			});
			// remove _origIndex before returning
			items = items.map(({ _origIndex, ...rest }) => rest);
		} catch (e) {
			console.error('[discover] error computing social ordering', e && e.message ? e.message : e);
		}

		// return response
		return res.json({ page, limit, total, maxDistance, maxRating, items })
	} catch (err) {
		return res.json({ msg: 'Fatal error', err: String(err && err.message ? err.message : err) })
	}
}