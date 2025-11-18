// Correction du champ data d'une image existante (pour fixer les doubles préfixes)
const fixImageData = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null });
	const { id, data } = req.body;
	if (!id || !data || typeof data !== 'string') {
		return res.json({ status: 'error', type: 'profile', message: 'Requête invalide', data: null });
	}
	try {
		// Nettoyage du base64 (on garde un seul préfixe, on retire les espaces)
		let cleanData = data.trim();
		if (cleanData.startsWith('data:image/')) {
			const match = cleanData.match(/^(data:image\/\w+;base64,)+/);
			if (match && match[0].length > 0) {
				const base64 = cleanData.replace(/^(data:image\/\w+;base64,)+/, '');
				cleanData = `${match[0].split(',')[0]},${base64.replace(/\s+/g, '')}`;
			} else {
				const parts = cleanData.split(',');
				if (parts.length > 1) {
					cleanData = `${parts[0]},${parts.slice(1).join(',').replace(/\s+/g, '')}`;
				}
			}
		} else {
			cleanData = `data:image/png;base64,${cleanData.replace(/\s+/g, '')}`;
		}

		// Correction directe en base, vérifie l'appartenance et update en une seule requête
		const db = require('../config/database');
		const result = await db.query(
			'UPDATE images SET data = $1 WHERE id = $2 AND user_id = $3 RETURNING id',
			[cleanData, id, req.user.id]
		);
		if (!result.rowCount) {
			return res.json({ status: 'error', type: 'profile', message: 'Image non trouvée ou non autorisée', data: null });
		}
		return res.json({ status: 'success', message: 'Image corrigée', data: { id, data: cleanData } });
	} catch (err) {
		return res.json({ status: 'error', type: 'profile', message: 'Erreur serveur', data: err });
	}
};
// Upload image de profil
const uploadProfileImage = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null });
	try {
		console.log('--- uploadProfileImage ---');
		console.log('req.file:', req.file);
		let data = null;
		let mime = 'image/png';
		if (req.file) {
			mime = req.file.mimetype || 'image/png';
			   data = req.file.buffer.toString('base64');
		} else if (req.body.data) {
			let incoming = req.body.data;
			if (typeof incoming === 'string') incoming = incoming.trim();
			// Si déjà un data URI complet, on nettoie les espaces et on garde
			   if (typeof incoming === 'string' && incoming.startsWith('data:image/')) {
				   // On retire le préfixe data:image/...;base64, et les espaces
				   data = incoming.replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
			   } else {
				   // On nettoie juste les espaces
				   data = String(incoming).replace(/\s+/g, '');
			   }
		} else {
			return res.json({ status: 'error', type: 'profile', message: 'Aucun fichier ou base64 reçu', data: null });
		}
			const link = 'false';
			// Mettre toutes les images profile:true à false pour ce user
			await require('../config/database').query('UPDATE images SET profile = false WHERE user_id = $1 AND profile = true', [req.user.id]);
			// Insérer la nouvelle image de profil comme avatar uniquement
			await userModel.insertImages({ id: req.user.id, link, data, profile: true, cover: false });
			// Récupérer toutes les images à jour
			const images = await userModel.getImages(req.user.id);
			return res.json({ status: 'success', type: 'profile', message: 'Photo de profil (avatar) ajoutée', data: { images, user_id: req.user.id } });
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
								console.error('[deleteImage] Fatal error:', err);
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
		let data = null;
		let mime = 'image/png';
		if (req.file) {
			mime = req.file.mimetype || 'image/png';
			data = req.file.buffer.toString('base64');
		} else if (req.body.data) {
			if (typeof req.body.data === 'string' && req.body.data.trim().startsWith('data:image/')) {
				data = req.body.data.trim().replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
			} else {
				data = String(req.body.data).replace(/\s+/g, '');
			}
		} else {
			return res.json({ status: 'error', type: 'profile', message: 'Aucun fichier ou base64 reçu', data: null });
		}
		const link = 'false';
		// On récupère profile/cover du body (booléen ou string)
		const isProfile = req.body.profile === true || req.body.profile === 'true' || req.body.profile === 1 || req.body.profile === '1';
		const isCover = req.body.cover === true || req.body.cover === 'true' || req.body.cover === 1 || req.body.cover === '1';
		// Si profile, on met TOUJOURS à jour les anciennes images profile:true (même s'il y en a déjà une)
		if (isProfile) {
			await require('../config/database').query('UPDATE images SET profile = false WHERE user_id = $1 AND profile = true', [req.user.id]);
		}
		// Si cover, on met TOUJOURS à jour les anciennes images cover:true
		if (isCover) {
			await require('../config/database').query('UPDATE images SET cover = false WHERE user_id = $1 AND cover = true', [req.user.id]);
		}
		let user = {
			id: req.user.id,
			link,
			data,
			profile: !!isProfile,
			cover: !!isCover
		}
		try {
			await userModel.insertImages(user)
		} catch (dbErr) {
			return res.json({ status: 'error', type: 'profile', message: 'Erreur insertion DB', data: dbErr })
		}
		// Récupérer toutes les images à jour
		const newImages = await userModel.getImages(req.user.id)
		return res.json({ status: 'success', type: 'profile', message: 'Image Updated', data: { images: newImages, user_id: req.user.id } })
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
		let data = null;
		let mime = 'image/png';
		if (req.file) {
			mime = req.file.mimetype || 'image/png';
			   data = req.file.buffer.toString('base64');
		} else if (req.body.data) {
			   if (typeof req.body.data === 'string' && req.body.data.trim().startsWith('data:image/')) {
				   data = req.body.data.trim().replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
			   } else {
				   data = String(req.body.data).replace(/\s+/g, '');
			   }
		} else {
			return res.json({ status: 'error', type: 'profile', message: 'Aucun fichier ou base64 reçu', data: null });
		}
		// Mettre toutes les images cover:true à false pour ce user
		await require('../config/database').query('UPDATE images SET cover = false WHERE user_id = $1 AND cover = true', [req.user.id]);
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
	console.log('=== DELETE IMAGE ROUTE CALLED ===');
	   if (!req.user.id)
		   return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: { images: [] } })
	   if (!req.body.id || isNaN(req.body.id)) {
		   const images = await require('../models/userModel').getImages(req.user.id);
		   return res.json({ status: 'error', type: 'profile', message: 'Invalid request', data: { images } })
	   }
	   try {
		   const imageId = parseInt(req.body.id, 10);
		   const userId = req.user.id;
		   const allImages = await require('../models/userModel').getImages(userId);
		   const result = await userModel.getImagesById(imageId, userId);
		   let fileError = null;
		   if (result.length) {
			   // Only unlink if link is a real local filename
			   if (result[0].link && result[0].link !== 'false' && !isExternal(result[0].link)) {
				   try {
					   await unlinkAsync(resolve(dirname(dirname(__dirname)), 'uploads', result[0].link))
				   } catch (err) {
					   // Ne bloque pas la suppression en base, mais note l'erreur
					   fileError = err;
				   }
			   }
			   const delRes = await userModel.delImage(imageId, userId);
			   if (!req.body.profile) {
				   await userModel.setImages(userId);
			   }
			   // Récupérer la liste à jour après suppression
			   const images = await require('../models/userModel').getImages(userId);
			   if (delRes) {
				   let msg = 'Image supprimée.';
				   if (fileError) msg += ' (Fichier déjà supprimé ou erreur fichier, image supprimée en base)';
				   return res.json({ status: 'success', type: 'profile', message: msg, data: { images } })
			   }
			   return res.json({ status: 'error', type: 'profile', message: `Suppression échouée (id: ${imageId}, user_id: ${userId})`, data: { images } })
		   } else {
			   // Image déjà supprimée ou inexistante, on renvoie la liste à jour
			   const images = await require('../models/userModel').getImages(userId);
			   return res.json({ status: 'error', type: 'profile', message: `Image déjà supprimée ou non trouvée (id: ${imageId}, user_id: ${userId})`, data: { images } })
		   }
	   } catch (err) {
		   // Toujours renvoyer la liste à jour même en cas d'erreur
		   const images = await require('../models/userModel').getImages(req.user.id);
		   // Vérifie si l'image existe encore dans la liste à jour
		   const imageId = req.body && req.body.id ? parseInt(req.body.id, 10) : null;
		   const imageStillExists = imageId && images.some(img => img.id === imageId);
		   let msg;
		   let status;
		   if (!imageStillExists) {
			   msg = "Image déjà supprimée.";
			   status = 'success';
		   } else {
			   msg = "Erreur serveur lors de la suppression";
			   status = 'error';
		   }
		   return res.json({ status, type: 'profile', message: msg, data: { images } })
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

// GET toutes les images de l'utilisateur connecté
const getUserImages = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'auth', message: 'Not logged in', data: null });
	try {
		const images = await require('../models/userModel').getImages(req.user.id);
		console.log('[BACKEND][getUserImages] Images lues en BDD:', images.map(img => ({id: img.id, link: img.link, data: img.data && img.data.substring(0,30)})));
		return res.json({ status: 'success', message: `Images récupérées (${images.length})`, data: { images } });
	} catch (err) {
		console.error('[BACKEND][getUserImages] Erreur:', err);
		return res.json({ status: 'error', type: 'profile', message: 'Erreur serveur lors de la récupération des images', data: err });
	}
};

// Route DELETE compatible avec axios.delete (data dans req.body)
const deleteImageHttp = async (req, res) => {
	// Pour axios.delete, data est dans req.body (si body-parser le permet)
	return deleteImage(req, res);
}

module.exports = {
	updateProfile,
	changeEmail,
	changePassword,
	uploadImages,
	uploadCover,
	deleteImage, // POST legacy
	deleteImageHttp, // DELETE moderne
	blacklisted,
	uploadProfileImage,
	fixImageData,
	getUserImages,
}