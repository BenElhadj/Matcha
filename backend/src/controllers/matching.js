const userModel = require('../models/userModel')
const notifModel = require('../models/notificationsModel')
const chatModel = require('../models/chatModel')
const matchModel = require('../models/matchingModel')

const { pool } = require('../config/database')

// Match action 


const match = async (req, res) => {
	if (!req.user.id) return res.json({ msg: 'Not logged in' })
	const targetId = parseInt(req.body.id, 10)
	if (typeof req.body.liked !== 'boolean' || !targetId || isNaN(targetId))
		return res.json({ msg: 'Invalid request' })
	try {
		const hasForward = await matchModel.getMatche(req.user.id, targetId)
		const hasReverse = await matchModel.getMatche(targetId, req.user.id)

		if (req.body.liked) {
			// LIKE: idempotent → si déjà présent, retourner ok
			if (!hasForward.length) {
				await matchModel.insertMatche(req.user.id, targetId)
			}
			// Mutual like → s'assurer que la conv existe et est autorisée
			if (hasReverse.length) {
				let conv = await chatModel.getConv(req.user.id, targetId)
				if (!conv.length) {
					await chatModel.insertConv(req.user.id, targetId)
				} else if (conv[0].allowed === false || conv[0].allowed === 0) {
					await chatModel.allowConv(conv[0].id_conversation)
				}
				// N'envoyer like_back que si on vient de créer le lien forward (éviter le spam)
				if (!hasForward.length) {
					await notifModel.insertNotif('like_back', req.user.id, targetId)
					// Realtime push for like_back so clients listening to notif:new can update instantly
					try {
						const io = req.app.get('io')
						if (io) io.to(`user:${targetId}`).emit('notif:new', {
							type: 'like_back', id_from: req.user.id, id_to: targetId, created_at: new Date().toISOString()
						})
					} catch (_) {}
				}
			} else {
				// Premier like → notifier seulement à la création
				if (!hasForward.length) {
					await notifModel.insertNotif('like', req.user.id, targetId)
					// Realtime push so recipient updates icons without refresh
					try {
						const io = req.app.get('io')
						if (io) io.to(`user:${targetId}`).emit('notif:new', {
							type: 'like', id_from: req.user.id, id_to: targetId, created_at: new Date().toISOString()
						})
					} catch (_) {}
				}
			}
			return res.json({ ok: true })
		} else {
			// UNLIKE: idempotent → supprimer les 2 sens si existants
			await matchModel.delMatche(req.user.id, targetId)
			await chatModel.disallowConv(req.user.id, targetId)
			await notifModel.insertNotif('unlike', req.user.id, targetId)
			// Realtime push to recipient for instant UI update
			try {
				const io = req.app.get('io')
				if (io) io.to(`user:${targetId}`).emit('notif:new', {
					type: 'unlike', id_from: req.user.id, id_to: targetId, created_at: new Date().toISOString()
				})
			} catch (_) {}
			return res.json({ ok: true })
		}
	} catch (err) {
		return res.json({ msg: 'Fatal error', err })
	}
}

module.exports = {
	match
}
