const express = require('express');

const {
  getProfile
} = require('../controllers/authController');

const authorization = require('../middlewares/authorization');

const router = express.Router();

router.get('/', authorization, getProfile);

module.exports = router;