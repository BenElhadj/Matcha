const userModel = require('../models/userModel')

// Update user location 

const updatePosition = async (req, res) => {
	if (!req.user.id)
		return res.json({ status: 'error', type: 'location', message: 'Not logged in', data: null })
	if (!req.body.lat || !req.body.lng || isNaN(req.body.lat) || isNaN(req.body.lng))
		return res.json({ status: 'error', type: 'location', message: 'Invalid request', data: null })
	try {
		const result = await userModel.updateLocation(req.body.lat, req.body.lng, req.user.id);
		if (!result || !result.rowCount)
			return res.json({ status: 'error', type: 'location', message: 'Something went wrong', data: null })
		return res.json({ status: 'success', type: 'location', message: 'Location updated', data: null })
	} catch (err) {
		return res.json({ status: 'error', type: 'location', message: 'Fatal error', data: err })
	}
}
module.exports = updatePosition