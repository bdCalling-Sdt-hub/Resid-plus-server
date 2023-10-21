const express = require('express');
const router = express.Router();
const { createTermsAndCondition, getAll, getAllForWebSite } = require("../controllers/termsAndConditionController");
const { isValidUser } = require('../middlewares/auth');


router.post('/', isValidUser, createTermsAndCondition);
router.get('/resid-website', getAllForWebSite);
router.get('/', isValidUser, getAll);

module.exports = router;