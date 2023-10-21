const express = require('express');
const router = express.Router();
const { isValidUser } = require('../middlewares/auth');
const { getAll, createPrivacyPolicy,getAllForWebSite } = require('../controllers/privacyPolicyController');


router.post('/', isValidUser, createPrivacyPolicy);
router.get('/resid-website', getAllForWebSite);
router.get('/', isValidUser, getAll);


module.exports = router;