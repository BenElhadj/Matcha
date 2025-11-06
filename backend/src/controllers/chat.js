const chatModel = require('../models/chatModel')
const notifModel = require('../models/notificationsModel')
const matchModel = require('../models/matchingModel')
const validator = require('../utility/validator')
// Get  conveersation (all )

const getConAll = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'chat', message: 'Not logged in', data: null })
	try {
		// Ensure conversations exist for mutual matches (legacy behavior)
		try {
			const following = await matchModel.getFollowing(req.user.id)
			const followers = await matchModel.getFollowers(req.user.id)
			const followSet = new Set(following.map(f => String(f.matched_id)))
			const mutualIds = followers
				.map(f => f.matcher_id)
				.filter(id => followSet.has(String(id)))
			for (const otherId of mutualIds) {
				const conv = await chatModel.getConv(req.user.id, otherId)
				if (!conv.length) {
					await chatModel.insertConv(req.user.id, otherId)
				}
			}
		} catch (e) {
			// Non-blocking: log and continue
			console.error('getConAll ensure mutual conversations error:', e?.message || e)
		}
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
	// If provided by client, forbid messaging yourself
	if (req.body.id_to && (parseInt(req.body.id_to) === parseInt(req.body.id_from))) {
		return res.json({ status: 'error', type: 'chat', message: 'Cannot message yourself', data: null })
	}
	if (!validator(req.body.message, 'msg'))
		return res.json({ status: 'error', type: 'chat', message: 'Invalid message', data: null })
	// Security: enforce sender identity matches the authenticated user
	if (Number(req.body.id_from) !== Number(req.user.id)) {
		return res.status(403).json({ status: 'error', type: 'chat', message: 'Forbidden: wrong sender', data: null })
	}
	try {
		const msg = {
			id_conversation: req.body.id_conversation,
			id_from: req.body.id_from,
			message: req.body.message.trim(),
			date: new Date(new Date().getTime())
		}
		if (msg.message.length > 2048)
			return res.json({ status: 'error', type: 'chat', message: 'Message too long', data: null })
		let convRows = await chatModel.getConversation(msg.id_conversation, msg.id_from, msg.id_from)
		if (!convRows.length)
			return res.json({ status: 'error', type: 'chat', message: 'Bad conversation', data: null })
		if (convRows[0].allowed === false || convRows[0].allowed === 0) {
			return res.json({ status: 'error', type: 'chat', message: 'Conversation not allowed', data: null })
		}
		// Insert message and update conversation last_msg/last_update
		const inserted = await chatModel.insertMsg(msg)
		await chatModel.updateConv(msg.date, inserted.id, msg.id_conversation)
		// Create a chat notification for the other participant
		try {
			const conv = convRows[0]
			const id_to = (conv.id_user1 === msg.id_from) ? conv.id_user2 : conv.id_user1
			await notifModel.insertNotifConv('chat', msg.id_from, id_to, msg.id_conversation)
		} catch (e) {
			console.error('sendMsg notif error:', e?.message || e)
		}
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