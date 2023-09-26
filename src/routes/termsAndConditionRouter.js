const express = require('express');
const router = express.Router();
const { createTermsAndCondition, getAll } = require("../controllers/termsAndConditionController");
const { isValidUser } = require('../middleWares/auth');


router.post('/', isValidUser, createTermsAndCondition);
router.get('/', isValidUser, getAll);

module.exports = router;