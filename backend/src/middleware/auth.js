const jwt = require('jsonwebtoken')

const { jwtBlacklist } = require('../controllers/auth')
const userModel = require('../models/userModel')

const auth = async (req, res, next) => {
	const token = req.header('x-auth-token') || req.body.token;
	if (!token)
		return res.json({ status: 'error', type: 'auth', message: 'No token, authorization denied', data: null });
	if (jwtBlacklist && jwtBlacklist.has(token)) {
		return res.json({ status: 'error', type: 'auth', message: 'Token is not valid', data: null });
	}
	try {
		const decoded = jwt.verify(token, process.env.SECRET);
		req.user = decoded;
		if (decoded.id) {
			let user = {};
			try {
				user = await userModel.getUserByIdD(decoded.id);
			} catch (err) {
				console.error('err auth in backend/auth.js ===> ', err);
			}
			req.user = user[0];
		}
		next();
	} catch (e) {
		res.json({ status: 'error', type: 'auth', message: 'Token is not valid', data: null });
	}
}

module.exports = auth
