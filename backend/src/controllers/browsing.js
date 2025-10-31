const userModel = require('../models/userModel')
const tagsModel = require('../models/tagsModel')

const notifModel = require('../models/notificationsModel')
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
		result = result.map(cur => {
			delete cur.password
			delete cur.vkey
			delete cur.rkey
			delete cur.verified
			delete cur.email
			delete cur.google_id
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
		
		// Add images for each user with proper format
		for (let i = 0; i < result.length; i++) {
			const images = await userModel.getImagesByUid(result[i].user_id);
			result[i].images = images
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
			// Add profile image for backward compatibility
			const profileImg = images.find(img => img.profile);
			if (profileImg) {
				result[i].name = profileImg.data ? `data:image/png;base64,${profileImg.data}` : (profileImg.link || null);
			}
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
			await notifModel.insertNotifVis(req.user.id, req.params.id)
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


const getAllHistory = async (req, res) => {
	if (!req.user.id)
		return res.json({ msg: 'not logged in' });
	try {
		const history = await historyModel.getAllHistory(req.user.id);
		res.json(history);
	} catch (err) {
		return res.json({ msg: 'Fatal error', err });
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
	if (!req.user.id)
		return res.json({ msg: 'not logged in' })
	try {
		const blacklist = await userModel.getBlocked(req.user.id)
		res.json(blacklist)
	}
	catch (err) {
		return res.json({ msg: 'Fatal error', err })
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

module.exports = {
	showUsers,
	showUserById,
	getHistory,
	getTags,
	getBlocked,
	getMatches,
	getAllHistory,
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
		const ratingMin = isFinite(q.ratingMin) ? Number(q.ratingMin) : 0
		const ratingMax = isFinite(q.ratingMax) ? Number(q.ratingMax) : 7
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
		rows = rows.map((u) => {
			// profile image from images.* (link or data)
			let profile_image = ''
			try {
				if (u.link) profile_image = u.link
				else if (u.data) profile_image = `data:image/png;base64,${u.data}`
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
				user_id: u.id || u.user_id || u.user_id, // normalize
				username: u.username,
				first_name: u.first_name,
				last_name: u.last_name,
				gender: u.gender,
				birthdate: u.birthdate,
				ageYears,
				tags: u.tags || '',
				city: u.city,
				country: u.country,
				lat: Number(u.lat),
				lng: Number(u.lng),
				rating: Number(u.rating) || 0,
				profile_image
			}
		})

		// Exclude blocked both ways
		// me blocks others
		const blk1 = await db.query('SELECT blocked FROM blocked WHERE blocker = $1', [me.id])
		const myBlockedSet = new Set(blk1.rows.map((r) => String(r.blocked)))
		// others block me
		const blk2 = await db.query('SELECT blocker FROM blocked WHERE blocked = $1', [me.id])
		const blockedBySet = new Set(blk2.rows.map((r) => String(r.blocker)))
		rows = rows.filter((u) => !myBlockedSet.has(String(u.user_id)) && !blockedBySet.has(String(u.user_id)))

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
		rows = rows.filter((u) => u.distanceKm >= 0 && u.distanceKm <= distanceMax)
		rows = rows.filter((u) => u.ageYears >= ageMin && u.ageYears <= ageMax)
		rows = rows.filter((u) => u.rating >= ratingMin && u.rating <= ratingMax)

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
		return res.json({ page, limit, total, items })
	} catch (err) {
		return res.json({ msg: 'Fatal error', err: String(err && err.message ? err.message : err) })
	}
}
