const userModel = require('../models/userModel')
const notifModel = require('../models/notificationsModel')
const matchingModel = require('../models/matchingModel')
const chatModel = require('../models/chatModel')

// Block user 

const blockUser = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'block', message: 'Not logged in', data: null })
	if (!req.body.id || isNaN(req.body.id))
		return res.json({ status: 'error', type: 'block', message: 'Invalid request', data: null })
	try {
		const alreadyBlocked = await userModel.isBlocked(req.user.id, req.body.id);
		if (!alreadyBlocked) {
			await userModel.blockUser(req.user.id, req.body.id)
			await chatModel.disallowConv(req.user.id, req.body.id)
			await matchingModel.delMatche(req.user.id, req.body.id)
			await notifModel.delNotif(req.user.id, req.body.id)
			await chatModel.delConv(req.user.id, req.body.id)
			// Informer les deux utilisateurs en temps réel
			try {
				const io = req.app.get('io')
				if (io) {
					io.to(`user:${req.body.id}`).emit('block', { by: req.user.id })
					io.to(`user:${req.user.id}`).emit('block', { by: req.user.id, target: req.body.id })
					io.to(`user:${req.user.id}`).emit('notif:clear', { with: req.body.id })
					io.to(`user:${req.body.id}`).emit('notif:clear', { with: req.user.id })
				}
			} catch (_) {}
			return res.json({ status: 'success', type: 'block', message: 'User blocked', data: null })
		} else {
			return res.json({ status: 'error', type: 'block', message: 'User already blocked', data: null })
		}
	} catch (err) {
		return res.json({ status: 'error', type: 'block', message: 'Fatal error', data: err })
	}
}

// Unblock user

const unblockUser = async (req, res) => {
	if (!req.user.id) {
		return res.json({ status: 'error', type: 'block', message: 'Not logged in', data: null })}
	if (!req.body.id || isNaN(req.body.id)){
		return res.json({ status: 'error', type: 'block', message: 'Invalid request', data: null })}
	try {
		const result = await userModel.unblockUser(req.user.id, req.body.id)
		// result is undefined, so check if the unblock actually deleted a row
		// Let's re-query to check if the block still exists
		const stillBlocked = await userModel.isBlocked(req.user.id, req.body.id);
		if (stillBlocked) {
			return res.json({ status: 'error', type: 'block', message: 'Cannot unblock user', data: null })
		}
		try {
			const io = req.app.get('io')
			if (io) {
				io.to(`user:${req.body.id}`).emit('unblock', { by: req.user.id })
				io.to(`user:${req.user.id}`).emit('unblock', { by: req.user.id, target: req.body.id })
			}
		} catch (_) {}
		res.json({ status: 'success', type: 'block', message: 'User unblocked', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'block', message: 'Fatal error', data: err })
	}
}

// Report User 

const reportUser = async (req, res) => {
	console.log('[API] POST /api/users/report', { userId: req.user.id, reportedId: req.body.id });
	if (!req.user.id) {
		console.log('[API] reportUser: Not logged in');
		return res.json({ status: 'error', type: 'report', message: 'Not logged in', data: null });
	}
	if (!req.body.id || isNaN(req.body.id)) {
		console.log('[API] reportUser: Invalid request', req.body);
		return res.json({ status: 'error', type: 'report', message: 'Invalid request', data: null });
	}
	try {
		await userModel.reportUser(req.user.id, req.body.id);
		// Vérification de l'insertion
		const check = await require('../utility/startbdd').pool.query(
			'SELECT * FROM blocked WHERE blocker = $1 AND blocked = $2 AND type = $3 ORDER BY created_at DESC LIMIT 1',
			[req.user.id, req.body.id, 'report']
		);
		if (check.rows.length > 0) {
			console.log('[API] reportUser: Inserted row:', check.rows[0]);
			return res.json({ status: 'success', type: 'report', message: 'User reported', data: check.rows[0] });
		} else {
			console.log('[API] reportUser: Insert failed');
			return res.json({ status: 'error', type: 'report', message: 'Insert failed', data: null });
		}
	} catch (err) {
		console.log('[API] reportUser: Fatal error', err);
		return res.json({ status: 'error', type: 'report', message: 'Fatal error', data: err });
	}
}

	module.exports = {
	   blockUser,
	   unblockUser,
	   reportUser
	}