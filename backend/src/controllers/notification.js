const notifModel = require('../models/notificationsModel')

// Insert Notificiation 

const insertChatNotif = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'notification', message: 'Not logged in', data: null })
	if (!req.body.id_from || isNaN(req.body.id_from))
		return res.json({ status: 'error', type: 'notification', message: 'Invalid request', data: null })
	if (!req.body.id_to || isNaN(req.body.id_to))
		return res.json({ status: 'error', type: 'notification', message: 'Invalid request', data: null })
	if (!req.body.id_conversation || isNaN(req.body.id_conversation))
		return res.json({ status: 'error', type: 'notification', message: 'Invalid request', data: null })
	if (!req.body.type)
		return res.json({ status: 'error', type: 'notification', message: 'Invalid request', data: null })
	// Forbid sending a notification to yourself
	if (parseInt(req.body.id_from) === parseInt(req.body.id_to)) {
		return res.json({ status: 'error', type: 'notification', message: 'Forbidden: self notification', data: null })
	}
	try {
			await notifModel.insertNotifConv(req.body.type, req.body.id_from, req.body.id_to, req.body.id_conversation)
			// Realtime push to recipient
			try {
				const io = req.app.get('io')
				if (io) io.to(`user:${req.body.id_to}`).emit('notif:new', {
					type: req.body.type,
					id_from: req.body.id_from,
					id_to: req.body.id_to,
					id_conversation: req.body.id_conversation,
					created_at: new Date().toISOString()
				})
			} catch (_) {}
			res.json({ status: 'success', type: 'notification', message: 'Notification inserted', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'notification', message: 'Fatal error', data: err })
	}
}

// Get All notification 

// Nouvelle version avec filtrage par type (visit, like, block, all)
const getAllNotif = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'notification', message: 'Not logged in', data: null })
	try {
		const limit = Math.min(parseInt(req.query.limit) || 50, 200)
		const page = Math.max(parseInt(req.query.page) || 1, 1)
		const offset = (page - 1) * limit
		const type = (req.query.type || '').toLowerCase()
		const includeBlocked = String(req.query.includeBlocked || '').toLowerCase() === '1' || String(req.query.includeBlocked || '').toLowerCase() === 'true'

		// Récupérer toutes les notifs (all)
		let notifResult = await notifModel.getNotifAll(req.user.id, 1000, 0, includeBlocked)

		// Récupérer tous les blocks/reports faits par les autres sur moi
		const db = require('../config/database')
		const blockedRows = await db.query(`
			SELECT blocked.id AS id, blocked.blocker AS id_from, blocked.type AS type, users.username, users.first_name, users.last_name, blocked.created_at AS date, images.link as profile_image, images.data as profile_data
			FROM blocked 
			JOIN users ON blocked.blocker = users.id 
			LEFT JOIN images ON users.id = images.user_id AND images.profile = TRUE 
			WHERE blocked.blocked = $1 AND (blocked.type = 'block' OR blocked.type = 'report')
		`, [req.user.id])
		let blockResult = blockedRows.rows.map(r => {
			let profile_image = null;
			if (r.profile_image && r.profile_image !== 'false' && r.profile_image !== '') {
				profile_image = r.profile_image;
			} else if (r.profile_data && r.profile_data !== 'false' && r.profile_data !== '') {
				profile_image = `data:image/png;base64,${r.profile_data}`;
			} else {
				profile_image = null;
			}
			return {
				id: r.id,
				id_from: r.id_from,
				from: r.id_from,
				type: r.type,
				username: r.username,
				first_name: r.first_name || '',
				last_name: r.last_name || '',
				date: r.date,
				is_read: true,
				profile_image,
				cover: null
			}
		})

		// Fusionner les deux sources
		let result = [...notifResult, ...blockResult]

		// Correction du mapping des types pour le filtrage
		let filterTypes = [];
		if (type === 'visit') filterTypes = ['visit', 'he_visit'];
		else if (type === 'like') filterTypes = ['like', 'he_like', 'he_like_back', 'he_unlike', 'like_back', 'unlike'];
		else if (type === 'block') filterTypes = ['block', 'report', 'he_report', 'he_unreport', 'he_block', 'he_unblock', 'you_block', 'you_unblock', 'you_report', 'you_unreport'];
		// Si type = all ou vide, on prend tout

		if (filterTypes.length > 0) {
			result = result.filter(r => filterTypes.includes(r.type))
		}

		// Tri chronologique (plus récent d'abord)
		result = result.sort((a, b) => new Date(b.date) - new Date(a.date))

		// Pagination manuelle après filtrage
		const total = result.length
		result = result.slice(offset, offset + limit)

		result = result.map(r => ({
			id: r.id,
			id_from: r.id_from,
			from: r.id_from,
			type: r.type,
			username: r.username,
			first_name: r.first_name || '',
			last_name: r.last_name || '',
			date: r.date,
			is_read: r.is_read,
			profile_image: r.profile_image || null,
			cover: r.cover || null
		}))

		res.json({ status: 'success', type: 'notification', message: 'Notifications fetched', data: {
			items: result,
			page,
			limit,
			total,
			type: type || 'all',
			includeBlocked
		} })
	} catch (err) {
		console.error('[notif:getAllNotif] error:', err && err.stack ? err.stack : err)
		const message = `Fatal error: ${err && err.message ? err.message : String(err)}`
		return res.json({ status: 'error', type: 'notification', message, data: {
			error: err && err.message ? err.message : String(err),
			stack: process.env.NODE_ENV === 'production' ? undefined : (err && err.stack ? String(err.stack) : undefined)
		} })
	}
}

// Update notif if seen by user

const updateNotif = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'notification', message: 'Not logged in', data: null })
	try {
		await notifModel.seenNotif(req.user.id)
			// sync other tabs for same user
			try {
				const io = req.app.get('io')
				if (io) io.to(`user:${req.user.id}`).emit('notif:seenAll')
			} catch (_) {}
			res.json({ status: 'success', type: 'notification', message: 'Notification updated', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'notification', message: 'Fatal error', data: err })
	}
}

const updateOneNotif = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'notification', message: 'Not logged in', data: null })
	const { id_from, id_to } = req.body;
	if (!id_from || !id_to || isNaN(id_from) || isNaN(id_to))
		return res.json({ status: 'error', type: 'notification', message: 'Invalid request', data: null })

	// Only allow marking notifications seen where the authenticated user is the recipient (id_to)
	if (parseInt(req.user.id) !== parseInt(id_to))
		return res.json({ status: 'error', type: 'notification', message: 'Forbidden', data: null })

	try {
		await notifModel.seenOneNotif(id_from, id_to)
			try {
				const io = req.app.get('io')
				if (io) io.to(`user:${id_to}`).emit('notif:seenFrom', { id_from })
			} catch (_) {}
			res.json({ status: 'success', type: 'notification', message: 'Notification updated', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'notification', message: 'Fatal error', data: err })
	}
}

// Suppression des notifications de soi à soi (admin)
const db = require('../config/database');
const cleanSelfNotif = async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id_from = id_to');
    res.json({ status: 'success', message: 'Notifications de soi à soi supprimées.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erreur serveur', error: err });
  }
};

module.exports = {
	insertChatNotif,
	getAllNotif,
	updateOneNotif,
	updateNotif,
	cleanSelfNotif,
	// Mark a list of notification IDs as read for the current user
	updateNotifByIds: async (req, res) => {
		if (!req.user?.id)
			return res.json({ status: 'error', type: 'notification', message: 'Not logged in', data: null })
		try {
			let { ids } = req.body || {}
			if (!Array.isArray(ids) || !ids.length)
				return res.json({ status: 'error', type: 'notification', message: 'Invalid request', data: null })
			const clean = Array.from(new Set(ids.map(id => parseInt(id, 10)).filter(n => Number.isInteger(n))))
			if (!clean.length)
				return res.json({ status: 'error', type: 'notification', message: 'Invalid request', data: null })
			const result = await notifModel.seenNotifByIds(req.user.id, clean)
			try {
				const io = req.app.get('io')
				if (io) io.to(`user:${req.user.id}`).emit('notif:seenIds', { ids: clean })
			} catch (_) {}
			return res.json({ status: 'success', type: 'notification', message: 'Notifications updated', data: result })
		} catch (err) {
			return res.json({ status: 'error', type: 'notification', message: 'Fatal error', data: String(err?.message || err) })
		}
	},
	// Lightweight debug endpoint to inspect auth + counts
	debug: async (req, res) => {
		if (!req.user?.id) return res.json({ status: 'error', type: 'notification', message: 'Not logged in', data: null })
		try {
			const mode = (req.query.mode || '').toString().toLowerCase()
			const includeBlocked = String(req.query.includeBlocked || '').toLowerCase() === '1' || String(req.query.includeBlocked || '').toLowerCase() === 'true'
			const total = await notifModel.countAllNotif(req.user.id)
			const totalAfterFilter = await notifModel.countAllNotifFiltered(req.user.id)
			const user = { id: req.user.id, email: req.user.email, username: req.user.username }
			res.json({ status: 'success', type: 'notification', message: 'Debug info', data: { user, meta: { total, totalAfterFilter }, params: { mode, includeBlocked } } })
		} catch (e) {
			console.error('[notif:debug] error:', e)
			res.json({ status: 'error', type: 'notification', message: 'Fatal error', data: String(e?.message || e) })
		}
	}
}