const userModel = require('../models/userModel')
const validator = require('../utility/validator')
const mailer = require('../utility/mail')

const multer = require('multer')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { readFile, writeFile, unlink, readSync } = require('fs')
const { dirname, resolve } = require('path')
const { promisify } = require('util')
const sign = promisify(jwt.sign)
const { randomBytes } = require('crypto')
const { send } = require('process')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const unlinkAsync = promisify(unlink)
const upload = multer({ limits: { fileSize: 4 * 1024 * 1024 } }) // v2 compatible
const htmlspecialchars = require('htmlspecialchars')

const randomHex = () => randomBytes(10).toString('hex')

const tokenExp = { expiresIn: 7 * 24 * 60 * 60 }

// Register a new user

const register = async (req, res) => {
	if (!validator(req.body.first_name, 'fname'))
		return res.json({ msg: 'First name is invalid' })
	if (!validator(req.body.last_name, 'lname'))
		return res.json({ msg: 'Last name is invalid' })
	if (!validator(req.body.email, 'email'))
		return res.json({ msg: 'Email is invalid' })
	if (!validator(req.body.username, 'username'))
		return res.json({ msg: 'Username is invalid' })
	if (!validator(req.body.password, 'password'))
		return res.json({ msg: 'Password is invalid' })

	try {
		const user = {
			first_name: htmlspecialchars(req.body.first_name),
			last_name: htmlspecialchars(req.body.last_name),
			username: htmlspecialchars(req.body.username),
			email: htmlspecialchars(req.body.email),
			password: await bcrypt.hash(req.body.password, 10),
			vkey: randomHex()
		}
		const existing = await userModel.getUser(user)
		if (existing.length === 0) {
			const created = await userModel.addUser(user)
				if (created) {
					try {
						await mailer.sendMail(user.email, user.vkey, 'users/verify')
						return res.json({ ok: true, status: 'You have been successfully registered, please verify your email' })
					} catch (mailErr) {
						// Si l'envoi du mail échoue, on supprime l'utilisateur créé pour éviter d'avoir
						// des comptes incomplets dans la base (rollback simple).
						try {
							await userModel.deleteUserById(created.id)
							console.warn('[register] Rolled back created user id=', created.id)
						} catch (delErr) {
							console.error('[register] Failed to rollback user after mail error:', delErr)
						}
						// Renvoyer une erreur claire au client
						return res.status(500).json({ msg: 'Registration failed: unable to send confirmation email. Please try again later.' })
					}
				}
				return res.json({ msg: 'Registration failed' })
		} else {
			return res.json({ msg: 'Username or Email already in use' })
		}
	} catch (err) {
		return res.json({ msg: 'Fatal error', err })
	}
}

// Validate user 

const verifyEmail = async (req, res) => {
	const vkey = htmlspecialchars(req.params.key)
	if (!vkey) return res.json({ msg: 'Cant validate' })
	try {
		const result = await userModel.getVkey(vkey)
		if (result.length === 0)
			return res.json({ msg: 'Invalid key' })
		if (result[0].verified)
			return res.json({ msg: 'User already verified' })
		await userModel.validateEmail(vkey)
		const payload = { id: result[0].id }
		const token = await sign(payload, process.env.SECRET, tokenExp)
		return res.render('verify', { token })
	} catch (err) {
		return res.json({ msg: 'Fatal error', err })
	}
}

module.exports = {
	register,
	verifyEmail
}