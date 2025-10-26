const chatModel = require('../models/chatModel')
const notifModel = require('../models/notificationsModel')
const validator = require('../utility/validator')
// Get  conveersation (all )

const getConAll = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'chat', message: 'Not logged in', data: null })
	try {
		let result = await chatModel.getConvAll(req.user.id)
		result = result.filter((cur, i) => {
			for (let j = 0; j < result.length; j++) {
				if (i != j && result[j].user_id == cur.user_id)
					return cur.profile
			}
			return true
		})
		res.json({ status: 'success', type: 'chat', message: 'Conversations fetched', data: result })
	} catch (err) {
		return res.json({ status: 'error', type: 'chat', message: 'Fatal error', data: err })
	}
}

// getInChat

const getInChat = async (req, res) => {
	if (!req.user || !req.user.id) {
		return res.json({ status: 'error', type: 'chat', message: 'Not logged in', data: null });
	}
	try {
		let result = await chatModel.getInChat(req.user.id);
		res.json({ status: 'success', type: 'chat', message: 'In chat fetched', data: result });
	} catch (err) {
		return res.json({ status: 'error', type: 'chat', message: 'Fatal error', data: err });
	}
}

// get not seen messages for a user 
const getNotSeenMsg = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'chat', message: 'Not logged in', data: null })
	try {
		const result = await chatModel.getNotSeenMsgModel(req.user.id)
		res.json({ status: 'success', type: 'chat', message: 'Not seen messages fetched', data: result })
	} catch (err) {
		return res.json({ status: 'error', type: 'chat', message: 'Fatal error', data: err })
	}
}

//  get messages / Seen √ / notif 

const getMessages = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'chat', message: 'Not logged in', data: null })
	if (!req.body.id || isNaN(req.body.id))
		return res.json({ status: 'error', type: 'chat', message: 'Invalid request', data: null })
	if (typeof req.body.page === 'undefined')
		return res.json({ status: 'error', type: 'chat', message: 'Invalid request', data: null })
	const page = req.body.page
	try {
		const result = await chatModel.getChat(req.body.id, page * 50)
		await chatModel.seenMsg(req.body.id, req.user.id)
		await notifModel.seenMsgNotif(req.body.id, req.user.id)
		res.json({ status: 'success', type: 'chat', message: 'Messages fetched', data: result.reverse() })
	} catch (err) {
		// Log error to console for debugging
		console.error('getMessages error:', err);
		// Return more detailed error info for debugging
		return res.json({ status: 'error', type: 'chat', message: 'Fatal error', data: err.message || err });
	}
}

// Updat conv 

const updateConv = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'chat', message: 'Not logged in', data: null })
	if (!req.body.id || isNaN(req.body.id))
		return res.json({ status: 'error', type: 'chat', message: 'Invalid request', data: null })
	try {
		await chatModel.seenMsg(req.body.id, req.user.id)
		await notifModel.seenMsgNotif(req.body.id, req.user.id)
		res.json({ status: 'success', type: 'chat', message: 'Conversation updated', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'chat', message: 'Fatal error', data: err })
	}
}

// Send Messages 

const sendMsg = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'chat', message: 'Not logged in', data: null })
	if (!req.body.id_conversation || isNaN(req.body.id_conversation))
		return res.json({ status: 'error', type: 'chat', message: 'Invalid request', data: null })
	if (!req.body.id_from || isNaN(req.body.id_from))
		return res.json({ status: 'error', type: 'chat', message: 'Invalid request', data: null })
	if (!validator(req.body.message, 'msg'))
		return res.json({ status: 'error', type: 'chat', message: 'Invalid message', data: null })
	try {
		const msg = {
			id_conversation: req.body.id_conversation,
			id_from: req.body.id_from,
			message: req.body.message.trim(),
			date: new Date(new Date().getTime())
		}
		if (msg.message.length > 2048)
			return res.json({ status: 'error', type: 'chat', message: 'Message too long', data: null })
		let result = await chatModel.getConversation(msg.id_conversation, msg.id_from, msg.id_from)
		if (!result.length)
			return res.json({ status: 'error', type: 'chat', message: 'Bad conversation', data: null })
		await chatModel.insertMsg(msg)
		await chatModel.updateConv(msg.date, result.insertId, msg.id_conversation)
		res.json({ status: 'success', type: 'chat', message: 'Message sent', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'chat', message: 'Fatal error', data: err })
	}
}
module.exports = {
	getConAll,
	getMessages,
	updateConv,
	sendMsg,
	getNotSeenMsg,
	getInChat
}