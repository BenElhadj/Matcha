const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { promisify } = require('util')
const sign = promisify(jwt.sign)
const mailer = require('../utility/mail')
const validator = require('../utility/validator')
const userModel = require('../models/userModel')
const { randomBytes } = require('crypto')
const randomHex = () => randomBytes(10).toString('hex')
const tokenExp = { expiresIn: 7200 }
let LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');

// Sending  forget password email 

const forget_password = async (req, res) => {
	console.log('[forget_password] Received request for:', req.body.email);
	if (!validator(req.body.email, 'email')) {
		console.log('[forget_password] Invalid email format:', req.body.email);
		return res.json({ status: 'error', type: 'forget_password', message: 'Email is invalid', data: null });
	}
	try {
		const key = randomHex();
		console.log('[forget_password] Generated key:', key);
		const user = {
			rkey: key,
			email: req.body.email
		};
		const affectedRows = await userModel.addRkey(user);
		console.log('[forget_password] addRkey result:', affectedRows);
		if (!affectedRows) {
			console.log('[forget_password] Email not found in DB:', req.body.email);
			return res.json({ status: 'error', type: 'forget_password', message: 'Email not found', data: null });
		}
		console.log('[forget_password] Sending recovery email...');
		try {
			await mailer.sendMail(req.body.email, key, 'auth/recover');
			console.log('[forget_password] Email sent successfully to:', req.body.email);
			return res.json({ status: 'success', type: 'forget_password', message: 'Recovery email sent', data: null });
		} catch (err) {
			console.error('[forget_password] Error sending mail:', err);
			return res.json({ status: 'error', type: 'forget_password', message: 'Error sending email', data: err });
		}
	} catch (err) {
		console.error('[forget_password] Fatal error:', err);
		return res.json({ status: 'error', type: 'forget_password', message: 'Fatal error', data: err });
	}
}

// Recover password [after sending email]

const recover_password = async (req, res) => {
	if (!req.params.key)
		return res.json({ status: 'error', type: 'forget_password', message: 'Invalid request', data: null });
	try {
		const rkey = req.params.key;
		const result = await userModel.getRkey(rkey);
		if (!result || result.length === 0) {
			return res.json({ status: 'error', type: 'forget_password', message: 'Invalid key', data: null });
		}
		const payload = { id: result[0].id };
		const token = await sign(payload, process.env.SECRET, tokenExp);
		return res.redirect(`${process.env.APP_URL}/recover?key=${rkey}&token=${token}`);
	} catch (err) {
		return res.json({ status: 'error', type: 'forget_password', message: 'Fatal error', data: err });
	}
}

/// Key check 

const check_key = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'forget_password', message: 'Not logged in', data: null });
	if (!req.body.key)
		return res.json({ status: 'error', type: 'forget_password', message: 'Invalid request', data: null });
	if (!validator(req.body.password, 'password'))
		return res.json({ status: 'error', type: 'forget_password', message: 'Password is invalid', data: null });
	try {
		const hashed = await bcrypt.hash(req.body.password, 10);
		const user = {
			id: req.user.id,
			rkey: req.body.key,
			password: hashed,
		};
		const key = req.body.key;
		const result = await userModel.getRkey(key);
		if (!result.length)
			return res.json({ status: 'error', type: 'forget_password', message: 'Invalid key', data: null });
		const affectedRows = await userModel.changeFrogottenPassword(user);
		if (!affectedRows)
			return res.json({ status: 'error', type: 'forget_password', message: 'Something went wrong', data: null });
		res.json({ status: 'success', type: 'forget_password', message: 'Password updated', data: null });
	} catch (err) {
		return res.json({ status: 'error', type: 'forget_password', message: 'Fatal error', data: err });
	}
}

/// Key destroy 

const destroy_key = async (req, res) => {
	if (!req.user || !req.user.id)
		return res.json({ status: 'error', type: 'forget_password', message: 'Not logged in', data: null });
	try {
		await userModel.destroyRkey(req.user.id);
		// Même si aucune ligne n'est modifiée (clé déjà vide), on considère l'opération comme un succès
		res.json({ status: 'success', type: 'forget_password', message: 'Key destroyed', data: null });
	} catch (err) {
		console.error('[destroy_key] Fatal error:', err);
		return res.json({ status: 'error', type: 'forget_password', message: 'Fatal error', data: err });
	}
}

module.exports = {
	forget_password,
	recover_password,
	check_key,
	destroy_key,
}
