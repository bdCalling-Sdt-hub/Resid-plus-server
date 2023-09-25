const express = require('express');
const router = express.Router();
const { isValidUser } = require('../middleWares/auth');
const { getAll, createPrivacyPolicy } = require('../controllers/privacyPolicy');


router.post('/', isValidUser, createPrivacyPolicy);
router.get('/', isValidUser, getAll);

module.exports = router;