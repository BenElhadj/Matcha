
const express = require('express')
const routes = express.Router()
const authCheck = require('../middleware/auth')
const browsing = require('../controllers/browsing')

// Qui j'ai signalé (paginated)
routes.get('/reported', authCheck, browsing.getReported)

// Qui m'a signalé (paginated)
routes.get('/reportedby', authCheck, browsing.getReportedBy)


routes.get('/history', authCheck, browsing.getHistory)
routes.get('/allhistory', authCheck, browsing.getAllHistory)
routes.get('/tags', authCheck, browsing.getTags)

// Nouvelle route : qui m'a bloqué (paginated)
routes.get('/blockedby', authCheck, browsing.getBlockedBy)

module.exports = routes
