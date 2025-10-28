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
	try {
		await notifModel.insertNotifConv(req.body.type, req.body.id_from, req.body.id_to, req.body.id_conversation)
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
			'rows:', Array.isArray(result) ? result.length : null,
			'rawCount:', rawCount, 'filteredCount:', filteredCount)

		// Normalise/clean results before sending
		result = result.map(r => ({
			id: r.id,
			id_from: r.id_from, // compat ancien front
			from: r.id_from,    // compat éventuelle
			type: r.type,
			username: r.username,
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
		console.error('[notif:getAllNotif] error:', err)
		return res.json({ status: 'error', type: 'notification', message: 'Fatal error', data: err })
	}
}

// Update notif if seen by user

const updateNotif = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'notification', message: 'Not logged in', data: null })
	try {
		await notifModel.seenNotif(req.user.id)
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
		res.json({ status: 'success', type: 'notification', message: 'Notification updated', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'notification', message: 'Fatal error', data: err })
	}
}

module.exports = {
	insertChatNotif,
	getAllNotif,
	updateOneNotif,
	updateNotif,
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