const express = require('express')
const routes = express.Router()
const authCheck = require('../middleware/auth')
const matching = require('../controllers/matching')
const browsing = require('../controllers/browsing')

routes.post('/match', authCheck, matching.match)
routes.post('/match/intent', authCheck, matching.intent)
routes.get('/getmatches', authCheck, browsing.getMatches)

module.exports = routes
