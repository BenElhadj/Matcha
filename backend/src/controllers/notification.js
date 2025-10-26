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
		let result = await notifModel.getNotif(req.user.id)
		result = result.filter((cur, i) => {
			for (let index = 0; index < result.length; index++) {
				if (i != index && result[index].id == cur.id) {
					return cur.profile
				}
			}
			return true
		}).map(cur => {
			if (cur.cover)
				cur.profile_image = ''
			return cur
		})
		res.json({ status: 'success', type: 'notification', message: 'Notifications fetched', data: result })
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