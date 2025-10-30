const userModel = require('../models/userModel')
const notifModel = require('../models/notificationsModel')
const chatModel = require('../models/chatModel')
const matchModel = require('../models/matchingModel')

const { pool } = require('../config/database')

// Match action and intent (confirmation messages originate from backend)


// Returns the current relation state between requester (req.user.id) and target (body.id)
// and what action/confirmation the client should present.
const intent = async (req, res) => {
    if (!req.user.id) return res.json({ msg: 'Not logged in' })
    const targetId = parseInt(req.body.id, 10)
    if (!targetId || isNaN(targetId)) return res.json({ msg: 'Invalid request' })
    try {
        const youLike = await matchModel.getMatche(req.user.id, targetId) // forward
        const heLike = await matchModel.getMatche(targetId, req.user.id) // reverse
        const conv = await chatModel.getConv(req.user.id, targetId)
        const convAllowed = Array.isArray(conv) && conv.length && (conv[0].allowed === true || conv[0].allowed === 1)

        let state = 'default'
        if (convAllowed || (youLike.length && heLike.length)) state = 'you_like_back'
        else if (youLike.length) state = 'you_like'
        else if (heLike.length) state = 'he_like'

        // Determine next action and confirmation message (FR as requested)
        let intent = { kind: 'like', confirm: false, message: "Envoyer une demande d'amitié ?" }
        if (state === 'you_like') {
            intent = {
                kind: 'cancel_like',
                confirm: true,
                message: "Voulez-vous annuler votre demande d'amitié ?"
            }
        } else if (state === 'he_like') {
            intent = {
                kind: 'respond',
                confirm: true,
                message: "Accepter la demande d'amitié ou la refuser ?",
                options: ['accept', 'decline']
            }
        } else if (state === 'you_like_back') {
            intent = {
                kind: 'unmatch',
                confirm: true,
                message: "Confirmer la suppression de l'amitié ?"
            }
        }

        return res.json({ ok: true, state, intent })
    } catch (err) {
        return res.json({ msg: 'Fatal error', err })
    }
}

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
				return res.json({ ok: true, message: "Demande acceptée, vous pouvez discuter ensemble." })
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
				return res.json({ ok: true, message: "Votre demande d'amitié a été envoyée." })
			}
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
			// Distinguish message based on prior state
			const msg = hasForward.length && !hasReverse.length
				? "Votre demande d'amitié a été annulée."
				: "Vous n'êtes plus amis."
			return res.json({ ok: true, message: msg })
		}
	} catch (err) {
		return res.json({ msg: 'Fatal error', err })
	}
}

module.exports = {
	match,
	intent
}
