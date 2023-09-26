const express = require('express');
const router = express.Router();
const { isValidUser } = require('../middleWares/auth');
const { getAll, createPrivacyPolicy } = require('../controllers/privacyPolicyController');


router.post('/', isValidUser, createPrivacyPolicy);
router.get('/', isValidUser, getAll);

module.exports = router;