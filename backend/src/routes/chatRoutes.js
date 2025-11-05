const express = require('express')
const routes = express.Router()
const authCheck = require('../middleware/auth')
const chat = require('../controllers/chat')

routes.get('/all', authCheck, chat.getConAll)
routes.post('/messages', authCheck, chat.getMessages)
routes.post('/update', authCheck, chat.updateConv)
routes.post('/send', authCheck, chat.sendMsg)
routes.get('/getInChat', authCheck, chat.getInChat)
// Return counts of unread (not seen) messages per conversation for the authenticated user
routes.get('/notSeen', authCheck, chat.getNotSeenMsg)

module.exports = routes
