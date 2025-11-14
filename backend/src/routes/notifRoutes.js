const express = require('express')
const routes = express.Router()
const authCheck = require('../middleware/auth')
const notif = require('../controllers/notification')


routes.post('/add', authCheck, notif.insertChatNotif)
routes.post('/update', authCheck, notif.updateNotif)
routes.put('/updateOneNotif', authCheck, notif.updateOneNotif)
routes.put('/updateByIds', authCheck, notif.updateNotifByIds)
routes.get('/all', authCheck, notif.getAllNotif)
routes.get('/debug', authCheck, notif.debug)

// Route admin pour supprimer les notifications de soi à soi
routes.post('/admin/clean-self-notif', notif.cleanSelfNotif)

module.exports = routes
