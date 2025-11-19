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
// Liste paginée des utilisateurs que j'ai signalés
const getReported = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', message: 'Not logged in', data: null });
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 25;
	const offset = (page - 1) * limit;
	try {
		const items = await userModel.getReported(req.user.id, limit, offset);
		const countRes = await db.query("SELECT COUNT(*) FROM blocked WHERE blocker = $1 AND type = 'report'", [req.user.id]);
		const total = parseInt(countRes.rows[0].count, 10);
		return res.json({ page, limit, total, items });
	} catch (err) {
		return res.json({ status: 'error', message: 'Fatal error', data: String(err && err.message ? err.message : err) });
	}
};

// Liste paginée des utilisateurs qui m'ont signalé
const getReportedBy = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', message: 'Not logged in', data: null });
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 25;
	const offset = (page - 1) * limit;
	try {
		const items = await userModel.getReportedBy(req.user.id, limit, offset);
		const countRes = await db.query("SELECT COUNT(*) FROM blocked WHERE blocked = $1 AND type = 'report'", [req.user.id]);
		const total = parseInt(countRes.rows[0].count, 10);
		return res.json({ page, limit, total, items });
	} catch (err) {
		return res.json({ status: 'error', message: 'Fatal error', data: String(err && err.message ? err.message : err) });
	}
};
// Liste paginée des utilisateurs qui m'ont bloqué
const getBlockedBy = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', message: 'Not logged in', data: null });
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 25;
	const offset = (page - 1) * limit;
	try {
		const items = await userModel.getBlockedBy(req.user.id, limit, offset);
		// Pour le total, on fait un COUNT
		const countRes = await db.query('SELECT COUNT(*) FROM blocked WHERE blocked = $1 AND type = \'block\'', [req.user.id]);
		const total = parseInt(countRes.rows[0].count, 10);
		return res.json({ page, limit, total, items });
	} catch (err) {
		return res.json({ status: 'error', message: 'Fatal error', data: String(err && err.message ? err.message : err) });
	}
};

const tagsModel = require('../models/tagsModel')

const historyModel = require('../models/historyModel')

const matchingModel = require('../models/matchingModel')
const distance = require('../utility/distance')
const db = require('../config/database')


// Show users (Global)

const showUsers = async (req, res) => {
	const user = req.user
	if (!user.id)
		return res.json({ msg: 'Not logged in' })
	try {
		   let result = await userModel.getUserBrow()
		   let userTags = user.tags
		   const userLoc = {
			   lat: user.lat,
			   lng: user.lng
		   }
		   const commonTags = a => {
			   if (!a || !a.length) return 0
			   const tags = a.split(',')
			   return userTags.split(',').filter(val => -1 !== tags.indexOf(val)).length
		   }
		   // Ajout des infos de like/match pour chaque user
		   // Récupérer la liste des users likés/matchés par l'utilisateur courant
		   let likedUsers = []
		   let matchedUsers = []
		   try {
			   likedUsers = (await matchingModel.getFollowing(user.id)).map(u => String(u.matched_id || u.user_id || u.id))
			   matchedUsers = (await matchingModel.getFollowers(user.id)).map(u => String(u.matcher_id || u.user_id || u.id))
		   } catch (e) {}

		   result = result.map(cur => {
			   delete cur.password
			   delete cur.vkey
			   delete cur.rkey
			   delete cur.verified
			   delete cur.email
			   delete cur.google_id
			   // Toujours fournir user_id (clé unique pour le front)
			   cur.user_id = cur.user_id || cur.id
			   // Ajout d'un champ profile_image explicite (base64 ou lien)
			   cur.profile_image = null
			   if (cur.link && cur.link !== 'false' && cur.link !== '') {
				   cur.profile_image = cur.link
			   } else if (cur.data && cur.data !== 'false' && cur.data !== '') {
				   cur.profile_image = `data:image/png;base64,${cur.data}`
			   }
			   return cur
		   }).filter(cur => {
			   if (!req.body.filter) return true;
			   return user.looking === 'all' || cur.gender === user.looking;
		   }).sort((a, b) => {
			   const aLoc = { lat: a.lat, lng: a.lng }
			   const bLoc = { lat: b.lat, lng: b.lng }
			   const disDelta = distance(userLoc, aLoc) - distance(userLoc, bLoc)
			   if (!disDelta && userTags && userTags.length) {
				   const disTag = commonTags(b.tags) - commonTags(a.tags)
				   return !disTag ? b.rating - a.rating : disTag
			   } else {
				   return !disDelta ? b.rating - a.rating : disDelta
			   }
		   })

		   // Add images for each user with proper format (base64 ou lien)
		   const defaultProfile = '/default/defaut_profile.txt';
		   for (let i = 0; i < result.length; i++) {
			   const userId = result[i].user_id || result[i].id;
			   let images = await userModel.getImagesByUid(userId);
			   images = images
				   .map(img => {
					   const validLink = img.link && img.link !== 'false' && img.link !== '' && img.link !== null && img.link !== undefined;
					   const validData = img.data && img.data !== 'false' && img.data !== '' && img.data !== null && img.data !== undefined;
					   if (validLink) {
						   return { ...img, link: img.link, data: null };
					   } else if (validData) {
						   return { ...img, link: null, data: `data:image/png;base64,${img.data}` };
					   } else {
						   return null;
					   }
				   })
				   .filter(Boolean);
			   // Si aucune image valide, injecter une image par défaut
			   if (!images.length) {
				   images = [{ link: defaultProfile, data: null, profile: true }];
			   }
			   result[i].images = images;
			   // Champ profile_image explicite (jamais null)
			   const profileImg = images.find(img => img.profile) || images[0];
			   if (profileImg) {
				   if (profileImg.data && profileImg.data.startsWith('data:image')) {
					   result[i].profile_image = profileImg.data;
				   } else if (profileImg.link && profileImg.link !== 'false' && profileImg.link !== '') {
					   result[i].profile_image = profileImg.link;
				   } else {
					   result[i].profile_image = defaultProfile;
				   }
			   } else {
				   result[i].profile_image = defaultProfile;
			   }
			   // Toujours fournir user_id
			   result[i].user_id = userId;
		   }

		   res.json(result)
	} catch (err) {
		return res.json({ msg: 'Fatal error', err })
	}
}

// Show users by id 

const showUserById = async (req, res) => {
	if (!req.user.id)
		return res.json({ msg: 'Not logged in' })
	if (!req.params.id || isNaN(req.params.id))
		return res.json({ msg: 'Invalid request' })
	try {
		const result = await userModel.getUserbyIdBrow(req.params.id, req.user.id)
		if (result.length) {
			const user = result[0]
			delete user.password
			delete user.vkey
			delete user.rkey
			delete user.verified
			delete user.email
			delete user.google_id
			user.images = (await userModel.getImagesByUid(user.id)).map(img => ({
				...img,
				link: img.link || null,
				data: img.data ? `data:image/png;base64,${img.data}` : null
			}));
			await historyModel.insertHistory(req.user.id, req.params.id)
			if (req.user.id !== parseInt(req.params.id, 10)) {
				await notifModel.insertNotifVis(req.user.id, req.params.id)
			}
			// Push a realtime notification to the visited user
			try {
				const io = req.app.get('io')
				if (io) io.to(`user:${req.params.id}`).emit('notif:new', {
					type: 'visit',
					id_from: req.user.id,
					id_to: parseInt(req.params.id, 10),
					created_at: new Date().toISOString()
				})
			} catch (e) {
				// non-fatal
			}
			res.json(user)
		} else {
			res.json({ msg: 'User doesnt exist' })
		}
	} catch (err) {
		return res.json({ msg: 'Fatal error', err })
	}
}

// get history of visits 

const getHistory = async (req, res) => {
	if (!req.user.id)
		return res.json({ msg: 'not logged in' })
	try {
		let visitors = await historyModel.getVisitors(req.user.id)
		visitors = visitors.filter((cur, i) => {
			for (let index = 0; index < visitors.length; index++) {
				if (i != index && visitors[index].username == cur.username)
					return cur.profile
			}
			return true
		})
		let visited = await historyModel.getVisited(req.user.id)
		visited = visited.filter((cur, i) => {
			for (let index = 0; index < visited.length; index++) {
				if (i != index && visited[index].username == cur.username)
					return cur.profile
			}
			return true
		})
		res.json([...visitors, ...visited])
	} catch (err) {
		return res.json({ msg: 'Fatal error', err })
	}
}



const userModel = require('../models/userModel');
const notificationsModel = require('../models/notificationsModel');

// Helper pour image de profil (link ou data), harmonisé avec allhistory
function getProfileImageCompat(img) {
	if (!img) return null;
	let val = null;
	if (img.link && img.link !== 'false' && img.link !== '') {
		val = img.link;
	} else if (img.data && img.data !== 'false' && img.data !== '') {
		val = img.data;
	}
	if (!val || val === 'false') return null;
	if (typeof val !== 'string') return null;
	const s = val.trim();
	if (s.startsWith('http') || s.startsWith('data:image')) return s;
	if (s.startsWith('/9j/')) return `data:image/jpeg;base64,${s}`;
	if (s.startsWith('iVBOR')) return `data:image/png;base64,${s}`;
	if (s.length > 100) return `data:image/jpeg;base64,${s}`;
	return null;
}

const getAllHistory = async (req, res) => {
	if (!req.user.id)
		return res.json({ msg: 'not logged in' });
	try {
		const userId = req.user.id;
		const type = req.query.type || 'all';
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;
		const offset = (page - 1) * limit;
		let items = [];
		let total = 0;

		// Helper pour image de profil (link ou data)
		const getProfileImage = (img) => {
			if (!img) return null;
			let val = null;
			if (img.link && img.link !== 'false' && img.link !== '') {
				val = img.link;
			} else if (img.data && img.data !== 'false' && img.data !== '') {
				val = img.data;
			}
			if (!val || val === 'false') return null;
			if (typeof val !== 'string') return null;
			const s = val.trim();
			if (s.startsWith('http') || s.startsWith('data:image')) return s;
			if (s.startsWith('/9j/')) return `data:image/jpeg;base64,${s}`;
			if (s.startsWith('iVBOR')) return `data:image/png;base64,${s}`;
			if (s.length > 100) return `data:image/jpeg;base64,${s}`;
			return null;
		};

		// 1. Création du compte
		if (type === 'creation') {
			const user = await userModel.getUserById(userId);
			if (user && user[0]) {
				items = [{
					type: 'creation',
					date: user[0].created_at,
					user_id: userId,
					username: user[0].username,
					first_name: user[0].first_name,
					last_name: user[0].last_name
					// plus de champ profile_image ici
				}];
				total = 1;
			}
			return res.json({ page, limit: 1, total, history: items });
		}

		// 2. Images ajoutées (avatar, cover, autres)
		if (type === 'add_image') {
			const images = await userModel.getImages(userId);
			const user = await userModel.getUserById(userId);
			items = images.map(img => ({
				type: img.profile ? 'avatar_img' : (img.cover ? 'cover_img' : 'other_img'),
				date: img.created_at,
				image: getProfileImage(img),
				image_id: img.id,
				user_id: userId,
				username: user[0]?.username,
				first_name: user[0]?.first_name,
				last_name: user[0]?.last_name
				// plus de champ my_avatar ici
			}));
			total = items.length;
			items = items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(offset, offset + limit);
			return res.json({ page, limit, total, history: items });
		}

		// 3. Visites effectuées (you_visit)
		if (type === 'visit') {
			   // Prendre toutes les notifications de type 'visit' où id_from = userId (actions faites par l'utilisateur)
			   const visitRows = await db.query(`
				   SELECT n.id, n.id_from, n.id_to, n.created_at as date, n.type, u.username, u.first_name, u.last_name
				   FROM notifications n
				   LEFT JOIN users u ON n.id_to = u.id
				   WHERE n.type = 'visit' AND n.id_from = $1
				   ORDER BY n.created_at DESC
				   LIMIT $2 OFFSET $3
			   `, [userId, limit, offset]);
			   const userIds = Array.from(new Set(visitRows.rows.map(n => n.id_to)));
			   const users = await userModel.getUsersByIds(userIds);
			   const userMap = {};
			   users.forEach(u => { userMap[u.id] = u; });
			   const imagesMap = await userModel.getImagesByUids(userIds);
			   items = visitRows.rows.map(n => {
				   const userInfo = userMap[n.id_to] || {};
				   const imgs = imagesMap[n.id_to] || [];
				   let profileImg = imgs.find(i => i.profile) || imgs[0];
				   let profile_image = getProfileImage(profileImg);
				   return {
					   type: 'you_visit',
					   date: n.date,
					   user_id: n.id_to,
					   username: n.username,
					   first_name: userInfo.first_name || '',
					   last_name: userInfo.last_name || '',
					   profile_image
				   };
			   });
			   // Pour le total, on compte toutes les notifications de type visit faites par l'utilisateur
			   const totalRes = await db.query(`SELECT COUNT(*) FROM notifications WHERE type = 'visit' AND id_from = $1`, [userId]);
			   total = parseInt(totalRes.rows[0].count, 10);
			   return res.json({ page, limit, total, history: items });
		}

		// 4. Likes/dislikes effectués (you_like, you_like_back, you_unlike)
		if (type === 'like') {
			   // Prendre toutes les notifications de type like/like_back/unlike où id_from = userId
			   const likeRows = await db.query(`
				   SELECT n.id, n.id_from, n.id_to, n.created_at as date, n.type, u.username, u.first_name, u.last_name
				   FROM notifications n
				   LEFT JOIN users u ON n.id_to = u.id
				   WHERE n.id_from = $1 AND n.type IN ('like', 'like_back', 'unlike')
				   ORDER BY n.created_at DESC
				   LIMIT $2 OFFSET $3
			   `, [userId, limit, offset]);
			   const likeUserIds = Array.from(new Set(likeRows.rows.map(n => n.id_to)));
			   const users = await userModel.getUsersByIds(likeUserIds);
			   const userMap = {};
			   users.forEach(u => { userMap[u.id] = u; });
			   const imagesMap = await userModel.getImagesByUids(likeUserIds);
			   items = likeRows.rows.map(n => {
				   const userInfo = userMap[n.id_to] || {};
				   const imgs = imagesMap[n.id_to] || [];
				   let profileImg = imgs.find(i => i.profile) || imgs[0];
				   let profile_image = getProfileImage(profileImg);
				   return {
					   type: n.type === 'like' ? 'you_like' : (n.type === 'like_back' ? 'you_like_back' : 'you_unlike'),
					   date: n.date,
					   user_id: n.id_to,
					   username: n.username,
					   first_name: userInfo.first_name || '',
					   last_name: userInfo.last_name || '',
					   profile_image
				   };
			   });
			   // Pour le total, on compte toutes les notifications de type like/like_back/unlike faites par l'utilisateur
			   const totalRes = await db.query(`SELECT COUNT(*) FROM notifications WHERE id_from = $1 AND type IN ('like', 'like_back', 'unlike')`, [userId]);
			   total = parseInt(totalRes.rows[0].count, 10);
			   return res.json({ page, limit, total, history: items });
		}

		// 5. Block/report/unblock/unreport effectués
		if (type === 'block') {
			const blocks = await userModel.getBlocked(userId);
			const reports = await userModel.getReported(userId, 10000, 0);
			const blockIds = blocks.map(b => b.blocked_id);
			const reportIds = reports.map(r => r.reported_id);
			const allIds = Array.from(new Set([...blockIds, ...reportIds]));
			const users = await userModel.getUsersByIds(allIds);
			const userMap = {};
			users.forEach(u => { userMap[u.id] = u; });
			items = [
				...blocks.map(b => {
					const userInfo = userMap[b.blocked_id] || {};
					return {
						type: 'you_block',
						date: b.blocked_at,
						user_id: b.blocked_id,
						username: b.username,
						first_name: userInfo.first_name || '',
						last_name: userInfo.last_name || '',
						profile_image: getProfileImage({ link: b.avatar, data: b.avatar })
					};
				}),
				...reports.map(r => {
					const userInfo = userMap[r.reported_id] || {};
					return {
						type: 'you_report',
						date: r.reported_at,
						user_id: r.reported_id,
						username: r.username,
						first_name: userInfo.first_name || '',
						last_name: userInfo.last_name || '',
						profile_image: getProfileImage({ link: r.avatar, data: r.avatar })
					};
				})
			];
			total = items.length;
			items = items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(offset, offset + limit);
			return res.json({ page, limit, total, history: items });
		}

		// 6. Tout mélangé (all)
		if (type === 'all') {
			   let allItems = [];
			   // 1. Création du compte
			   const user = await userModel.getUserById(userId);
			   const images = await userModel.getImagesByUid(userId);
			   if (user && user[0]) {
				   allItems.push({
					   type: 'creation',
					   date: user[0].created_at,
					   user_id: userId,
					   username: user[0].username,
					   first_name: user[0].first_name,
					   last_name: user[0].last_name
				   });
			   }
			   // 2. Images ajoutées
			   allItems = allItems.concat(images.map(img => ({
				   type: img.profile ? 'avatar_img' : (img.cover ? 'cover_img' : 'other_img'),
				   date: img.created_at,
				   image: (img.link && img.link !== 'false' && img.link !== '') ? img.link : (img.data && img.data !== 'false' && img.data !== '' ? (img.data.startsWith('data:image') ? img.data : `data:image/png;base64,${img.data}`) : null),
				   image_id: img.id,
				   user_id: userId,
				   username: user[0]?.username,
				   first_name: user[0]?.first_name,
				   last_name: user[0]?.last_name
			   })));
			   // 3. Visites effectuées
			   const visitRows = await db.query(`
				   SELECT n.id, n.id_from, n.id_to, n.created_at as date, n.type, u.username, u.first_name, u.last_name
				   FROM notifications n
				   LEFT JOIN users u ON n.id_to = u.id
				   WHERE n.type = 'visit' AND n.id_from = $1
				   ORDER BY n.created_at DESC
				   LIMIT 10000 OFFSET 0
			   `, [userId]);
			   const visitUserIds = Array.from(new Set(visitRows.rows.map(n => n.id_to)));
			   const visitUsers = await userModel.getUsersByIds(visitUserIds);
			   const visitUserMap = {};
			   visitUsers.forEach(u => { visitUserMap[u.id] = u; });
			   const visitImagesMap = await userModel.getImagesByUids(visitUserIds);
			   allItems = allItems.concat(visitRows.rows.map(n => {
				   const userInfo = visitUserMap[n.id_to] || {};
				   const imgs = visitImagesMap[n.id_to] || [];
				   let profileImg = imgs.find(i => i.profile) || imgs[0];
				   let profile_image = getProfileImage(profileImg);
				   return {
					   type: 'you_visit',
					   date: n.date,
					   user_id: n.id_to,
					   username: n.username,
					   first_name: userInfo.first_name || '',
					   last_name: userInfo.last_name || '',
					   profile_image
				   };
			   }));
			   // 4. Likes/dislikes effectués
			   const likeRows = await db.query(`
				   SELECT n.id, n.id_from, n.id_to, n.created_at as date, n.type, u.username, u.first_name, u.last_name
				   FROM notifications n
				   LEFT JOIN users u ON n.id_to = u.id
				   WHERE n.id_from = $1 AND n.type IN ('like', 'like_back', 'unlike')
				   ORDER BY n.created_at DESC
				   LIMIT 10000 OFFSET 0
			   `, [userId]);
			   const likeUserIds = Array.from(new Set(likeRows.rows.map(n => n.id_to)));
			   const likeUsers = await userModel.getUsersByIds(likeUserIds);
			   const likeUserMap = {};
			   likeUsers.forEach(u => { likeUserMap[u.id] = u; });
			   const likeImagesMap = await userModel.getImagesByUids(likeUserIds);
			   allItems = allItems.concat(likeRows.rows.map(n => {
				   const userInfo = likeUserMap[n.id_to] || {};
				   const imgs = likeImagesMap[n.id_to] || [];
				   let profileImg = imgs.find(i => i.profile) || imgs[0];
				   let profile_image = null;
				   if (profileImg) {
					   if (profileImg.link && profileImg.link !== 'false' && profileImg.link !== '') {
						   profile_image = profileImg.link;
					   } else if (profileImg.data && profileImg.data !== 'false' && profileImg.data !== '') {
						   profile_image = profileImg.data.startsWith('data:image') ? profileImg.data : `data:image/png;base64,${profileImg.data}`;
					   }
				   }
				   return {
					   type: n.type === 'like' ? 'you_like' : (n.type === 'like_back' ? 'you_like_back' : 'you_unlike'),
					   date: n.date,
					   user_id: n.id_to,
					   username: n.username,
					   first_name: userInfo.first_name || '',
					   last_name: userInfo.last_name || '',
					   profile_image
				   };
			   }));
			   // 5. Block/report effectués
			   const blocks = await userModel.getBlocked(userId);
			   const reports = await userModel.getReported(userId, 10000, 0);
			   const blockIds = blocks.map(b => b.blocked_id);
			   const reportIds = reports.map(r => r.reported_id);
			   const allBlockReportIds = Array.from(new Set([...blockIds, ...reportIds]));
			   const blockReportUsers = await userModel.getUsersByIds(allBlockReportIds);
			   const blockReportUserMap = {};
			   blockReportUsers.forEach(u => { blockReportUserMap[u.id] = u; });
			   allItems = allItems.concat([
				   ...blocks.map(b => {
					   const userInfo = blockReportUserMap[b.blocked_id] || {};
					   let profile_image = getProfileImage({ link: b.avatar, data: b.avatar });
					   return {
						   type: 'you_block',
						   date: b.blocked_at,
						   user_id: b.blocked_id,
						   username: b.username,
						   first_name: userInfo.first_name || '',
						   last_name: userInfo.last_name || '',
						   profile_image
					   };
				   }),
				   ...reports.map(r => {
					   const userInfo = blockReportUserMap[r.reported_id] || {};
					   let profile_image = getProfileImage({ link: r.avatar, data: r.avatar });
					   return {
						   type: 'you_report',
						   date: r.reported_at,
						   user_id: r.reported_id,
						   username: r.username,
						   first_name: userInfo.first_name || '',
						   last_name: userInfo.last_name || '',
						   profile_image
					   };
				   })
			   ]);
			   // Tri et pagination
			   allItems = allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
			   total = allItems.length;
			   items = allItems.slice(offset, offset + limit);
			   return res.json({ page, limit, total, history: items });
		}

		// Si type inconnu
		return res.json({ page, limit, total: 0, history: [] });
	} catch (err) {
		return res.json({ msg: 'Fatal error', err: String(err && err.message ? err.message : err) });
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
		for (let notif of notifs) {
			// Recherche dans tous les champs possibles (avatar, profile_image, cover)
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
			notif.profile_image = val;
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