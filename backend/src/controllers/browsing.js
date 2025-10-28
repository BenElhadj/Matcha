const userModel = require('../models/userModel')
const tagsModel = require('../models/tagsModel')

const notifModel = require('../models/notificationsModel')
const historyModel = require('../models/historyModel')

const matchingModel = require('../models/matchingModel')
const distance = require('../utility/distance')


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
    let following = await matchingModel.getFollowing(req.user.id)
    let followers = await matchingModel.getFollowers(req.user.id)
    // Fusionner les deux listes
    let all = [...following, ...followers]
    // Grouper par username, garder l'entrée avec profile=true si possible
    const unique = {}
    for (const user of all) {
      if (!unique[user.username]) {
        unique[user.username] = user
      } else if (user.profile) {
        unique[user.username] = user
      }
    }
    // Retourner la liste unique
    res.json(Object.values(unique))
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
	getAllHistory
}
