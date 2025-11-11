// Upload image de profil
const uploadProfileImage = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null })
	try {
		console.log('--- uploadProfileImage ---');
		console.log('req.file:', req.file);
		if (!req.file) {
			return res.json({ status: 'error', type: 'profile', message: 'Aucun fichier reçu (req.file vide)', data: null });
		}
		// Always store as base64 in `data` and set `link` to 'false'
		const mime = req.file.mimetype || 'image/png';
		const data = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
		const link = 'false';
		// Mettre tous les profile à 0
		await userModel.updateProfilePic(req.user.id);
		// Insérer la nouvelle image de profil
		await userModel.insertImages({ id: req.user.id, link, data, profile: true, cover: false });
		// Récupérer toutes les images à jour
		const images = await userModel.getImages(req.user.id);
		return res.json({ status: 'success', type: 'profile', message: 'Profile image updated', data: { images, user_id: req.user.id } });
	} catch (err) {
		console.error('Erreur uploadProfileImage:', err);
		return res.json({ status: 'error', type: 'profile', message: 'Erreur serveur: ' + (err.message || err), data: err });
	}
}
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { promisify } = require('util')
const validator = require('../utility/validator')
const userModel = require('../models/userModel')
const tagsModel = require('../models/tagsModel')
const { randomBytes } = require('crypto')
const { AsyncResource } = require('async_hooks')
const { dirname, resolve } = require('path')

const { readFile, writeFile, unlink } = require('fs')
const writeFileAsync = promisify(writeFile)
const unlinkAsync = promisify(unlink)

const randomHex = () => randomBytes(10).toString('hex')
const isExternal = url => url && (url.indexOf(':') > -1 || url.indexOf('//') > -1 || url.indexOf('www.') > -1)
const tokenExp = { expiresIn: 7 * 24 * 60 * 60 }

// Update user profile 

const updateProfile = async (req, res) => {
	if (!req.user.id) return res.json({ msg: 'Not logged in' })
	if (!validator(req.body.first_name, 'fname'))
		return res.json({ status: 'error', type: 'profile', message: 'First name is invalid', data: null })
	if (!validator(req.body.last_name, 'lname'))
		return res.json({ status: 'error', type: 'profile', message: 'Last name is invalid', data: null })
	if (!validator(req.body.email, 'email'))
		return res.json({ status: 'error', type: 'profile', message: 'Email is invalid', data: null })
	if (!validator(req.body.username, 'username'))
		return res.json({ status: 'error', type: 'profile', message: 'Username is invalid', data: null })
	if (!validator(req.body.gender, 'gender'))
		return res.json({ status: 'error', type: 'profile', message: 'Gender is invalid', data: null })
	if (!validator(req.body.looking, 'looking'))
		return res.json({ status: 'error', type: 'profile', message: 'Looking is invalid', data: null })
	if (!validator(req?.body?.phone, 'phone'))
		return res.json({ status: 'error', type: 'profile', message: 'Phone number is invalid', data: null })
	if (req.body.birthdate && new Date(req.body.birthdate) >= new Date().getTime())
		return res.json({ status: 'error', type: 'profile', message: 'Birthdate is invalid', data: null })
	if (req?.body?.biography?.length > 500)
		return res.json({ status: 'error', type: 'profile', message: 'bio is too large', data: null })
	let Tags
	if (req.body.tags)
		Tags = req.body.tags.split(',')
	else
		Tags = []
	if (Tags.length > 20) return res.json({ status: 'error', type: 'profile', message: 'Too many tags', data: null })
	for (const iterator of Tags) {
		if (iterator.length > 25)
			return res.json({ status: 'error', type: 'profile', message: 'Tags are invalid', data: null })
	}
	try {
		const result = await userModel.getUserById(req.user.id)
		if (result.length) {
			const user = {
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				username: req.body.username,
				email: req.body.email,
				gender: req.body.gender,
				looking: req.body.looking,
				birthdate: req.body.birthdate,
				biography: req.body.biography,
				tags: req.body.tags,
				address: req.body.address,
				city: req.body.city,
				country: req.body.country,
				postal_code: req.body.postal_code,
				phone: req.body.phone,
				id: req.user.id
			}
			const updateRes = await userModel.updateProfile(user)
			if (updateRes) {
				const tagsList = await tagsModel.getTags()
				const tags = tagsList.map(cur => cur.value)
				if (user.tags) {
					for (const element of user.tags.split(', ')) {
						if (!tags.includes(element)) {
							try {
								await tagsModel.insertTags(element)
							} catch (err) {
								return res.json({ status: 'error', type: 'profile', message: 'Fatal error', data: err })
							}
						}
					}
				}
				return res.json({ status: 'success', type: 'profile', message: 'User Updated', data: null })
			}
			return res.json({ status: 'error', type: 'profile', message: 'User not updated', data: null })
		} else {
			return res.json({ status: 'error', type: 'profile', message: 'User not found', data: null })
		}
	} catch (err) {
		return res.json({ status: 'error', type: 'profile', message: 'Fatal error', data: err })
	}
}


// Change Email 

const changeEmail = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null })
	if (!validator(req.body.email, 'email'))
		return res.json({ status: 'error', type: 'profile', message: 'Email is invalid', data: null })
	if (!validator(req.body.password, 'password'))
		return res.json({ status: 'error', type: 'profile', message: 'Password is invalid', data: null })
	if (req.user.email == req.body.email)
		return res.json({ status: 'error', type: 'profile', message: 'The provided email matches your current email', data: null })
	try {
		let hash = await bcrypt.compare(req.body.password, req.user.password)
		if (!hash)
			return res.json({ status: 'error', type: 'profile', message: 'Wrong password', data: null })
		const result = await userModel.getUserByemail(req.body.email)
		if (result.length)
			return res.json({ status: 'error', type: 'profile', message: 'Email already exists', data: null })
		let user = {
			id: req.user.id,
			email: req.body.email
		}
		const updateRes = await userModel.changeEmail(user)
		if (!updateRes)
			return res.json({ status: 'error', type: 'profile', message: 'Something went wrong', data: null })
		return res.json({ status: 'success', type: 'profile', message: 'Email updated', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'profile', message: 'Fatal error', data: err })
	}
}

// Change password ~ 

const changePassword = async (req, res) => {
	if (!req.user.id) return res.json({ msg: 'Not logged in' })
	if (!validator(req.body.password, 'password'))
		return res.json({ status: 'error', type: 'profile', message: 'Password is invalid', data: null })
	if (!validator(req.body.newPassword, 'password'))
		return res.json({ status: 'error', type: 'profile', message: 'New password is invalid', data: null })
	if (!req.body.confNewPassword || req.body.newPassword != req.body.confNewPassword)
		return res.json({ status: 'error', type: 'profile', message: 'Confirmation password is invalid', data: null })
	if (req.body.password == req.body.newPassword)
		return res.json({ status: 'error', type: 'profile', message: 'The provided password matches your current password', data: null })
	try {
		let hash = await bcrypt.compare(req.body.password, req.user.password)
		if (!hash)
			return res.json({ status: 'error', type: 'profile', message: 'Wrong password', data: null })
		const password = await bcrypt.hash(req.body.newPassword, 10)
		let user = {
			password: password,
			id: req.user.id
		}
		const updateRes = await userModel.changePassword(user)
		if (!updateRes)
			return res.json({ status: 'error', type: 'profile', message: 'Something went wrong', data: null })
		return res.json({ status: 'success', type: 'profile', message: 'Password updated', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'profile', message: 'Fatal error', data: err })
	}
}

// Upload images 

const uploadImages = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null })
	try {
		const images = await userModel.getImages(req.user.id)
		if (images.length < 5) {
			// Always store as base64 in `data` and set `link` to 'false'
			const mime = req.file?.mimetype || 'image/png'
			const data = req.file ? `data:${mime};base64,${req.file.buffer.toString('base64')}` : null
			const link = 'false'
			let user = {
				id: req.user.id,
				link,
				data,
				profile: false,
				cover: false
			}
			try {
				await userModel.insertImages(user)
			} catch (dbErr) {
				return res.json({ status: 'error', type: 'profile', message: 'Erreur insertion DB', data: dbErr })
			}
			// Récupérer toutes les images à jour
			const newImages = await userModel.getImages(req.user.id)
			return res.json({ status: 'success', type: 'profile', message: 'Image Updated', data: { images: newImages, user_id: req.user.id } })
		} else {
			return res.json({ status: 'error', type: 'profile', message: 'User already has 5 photos', data: null })
		}
	} catch (err) {
		return res.json({ status: 'error', type: 'profile', message: 'Fatal error', data: err })
	}
}

// Upload cover 

const uploadCover = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null })
	try {
		console.log('--- uploadCover ---');
		console.log('req.file:', req.file);
		if (!req.file) {
			return res.json({ status: 'error', type: 'profile', message: 'Aucun fichier reçu (req.file vide)', data: null });
		}
		const result = await userModel.getCover(req.user.id);
		if (result.length) {
			await userModel.delCover(result[0].id, req.user.id);
		}
		// Always store as base64 in `data` and set `link` to 'false'
		const mime = req.file.mimetype || 'image/png';
		const data = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
		const link = 'false';
		// Insérer la nouvelle cover
		await userModel.insertImages({ id: req.user.id, link, data, profile: false, cover: true });
		// Récupérer toutes les images à jour
		const images = await userModel.getImages(req.user.id);
		return res.json({ status: 'success', type: 'profile', message: 'Cover image updated', data: { images, user_id: req.user.id } });
	} catch (err) {
		console.error('Erreur uploadCover:', err);
		return res.json({ status: 'error', type: 'profile', message: 'Erreur serveur: ' + (err.message || err), data: err });
	}
}

// DELETE IMAGES

const deleteImage = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null })
	if (!req.body.id || isNaN(req.body.id))
		return res.json({ status: 'error', type: 'profile', message: 'Invalid request', data: null })
	try {
		const result = await userModel.getImagesById(req.body.id, req.user.id)
		if (result.length) {
			// Only unlink if link is a real local filename
			if (result[0].link && result[0].link !== 'false' && !isExternal(result[0].link)) {
				try {
					await unlinkAsync(resolve(dirname(dirname(__dirname)), 'uploads', result[0].link))
				} catch (err) {
					return res.json({ status: 'error', type: 'profile', message: 'Fatal error', data: err })
				}
			}
			const delRes = await userModel.delImage(req.body.id, req.user.id)
			if (!req.body.profile) {
				await userModel.setImages(req.user.id)
			}
			if (delRes)
				return res.json({ status: 'success', type: 'profile', message: 'Image deleted', data: null })
			return res.json({ status: 'error', type: 'profile', message: 'Something went wrong', data: null })
		} else {
			return res.json({ status: 'error', type: 'profile', message: 'Something went wrong', data: null })
		}
	} catch (err) {
		return res.json({ status: 'error', type: 'profile', message: 'Fatal error', data: err })
	}
}

const blacklisted = async (req, res) => {
	if (!req.user.id) {
	  return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null })
	}
	const id = req.body.id; 
	if (!Array.isArray(id) || !id.length) {
	  return res.json({ status: 'error', type: 'profile', message: 'Bad query', data: null })
	}
	const placehoder = `(${id.map(cur => '?').join(', ')}`
	try {
	  const result = await userModel.blacklist(id, placehoder)
	  res.json({ status: 'success', type: 'profile', message: 'Blacklist updated', data: result });
	} catch (err) {
	  return res.json({ status: 'error', type: 'profile', message: 'Fatal error', data: err });
	}
}


module.exports = {
	updateProfile,
	changeEmail,
	changePassword,
	uploadImages,
	uploadCover,
	deleteImage,
	blacklisted,
	uploadProfileImage
}