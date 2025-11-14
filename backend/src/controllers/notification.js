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

const getAllNotif = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'notification', message: 'Not logged in', data: null })
	try {
		// Support pagination via query params: ?limit=20&page=1
			const limit = Math.min(parseInt(req.query.limit) || 50, 200) // cap to avoid huge responses
			const page = Math.max(parseInt(req.query.page) || 1, 1)
		const offset = (page - 1) * limit

			const mode = (req.query.mode || '').toString().toLowerCase()
			const useAll = mode === 'all'
			const includeBlocked = String(req.query.includeBlocked || '').toLowerCase() === '1' || String(req.query.includeBlocked || '').toLowerCase() === 'true'
		// Fetch items
		let result = useAll
				? await notifModel.getNotifAll(req.user.id, limit, offset, includeBlocked)
				: await notifModel.getNotif(req.user.id, limit, offset, includeBlocked)

		// Lightweight diagnostics to help understand empty sets in prod
		let rawCount = 0, filteredCount = 0
		try {
			rawCount = await notifModel.countAllNotif(req.user.id)
			filteredCount = await notifModel.countAllNotifFiltered(req.user.id)
		} catch (e) {
			// non-fatal
		}

		console.log('[notif:getAllNotif] user:', req.user.id, 'mode:', useAll ? 'all' : 'latest', 'includeBlocked:', includeBlocked, 'page:', page, 'limit:', limit,
			'rows:', Array.isArray(result) ? result.length : (result == null ? 'null' : typeof result),
			'rawCount:', rawCount, 'filteredCount:', filteredCount)

		// Normalise/clean results before sending
		if (!Array.isArray(result)) {
			console.warn('[notif:getAllNotif] unexpected result type, coercing to []')
			result = []
		}
		   result = result.map(r => ({
			   id: r.id,
			   id_from: r.id_from, // compat ancien front
			   from: r.id_from,    // compat éventuelle
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
			mode: useAll ? 'all' : 'latest-per-sender',
			includeBlocked,
			meta: { total: rawCount, totalAfterFilter: filteredCount }
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