const express = require('express');
const router = express.Router();
const { createAboutUs, getAll } = require("../controllers/aboutUsController");
const { isValidUser } = require('../middlewares/auth');


router.post('/', isValidUser, createAboutUs);
router.get('/', isValidUser, getAll);

module.exports = router;