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

		let result = await notifModel.getNotif(req.user.id, limit, offset)

		// Normalise/clean results before sending
		result = result.map(r => ({
			id: r.id,
			from: r.id_from,
			type: r.type,
			username: r.username,
			date: r.date,
			is_read: r.is_read,
			profile_image: r.profile_image || null,
			cover: r.cover || null
		}))

		res.json({ status: 'success', type: 'notification', message: 'Notifications fetched', data: { items: result, page, limit } })
	} catch (err) {
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
	updateNotif
}