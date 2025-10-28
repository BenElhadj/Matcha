const express = require('express')
const routes = express.Router()
const authCheck = require('../middleware/auth')
const notif = require('../controllers/notification')


routes.post('/add', authCheck, notif.insertChatNotif)
routes.post('/update', authCheck, notif.updateNotif)
routes.put('/updateOneNotif', authCheck, notif.updateOneNotif)
routes.get('/all', authCheck, notif.getAllNotif)
routes.get('/debug', authCheck, notif.debug)

module.exports = routes
