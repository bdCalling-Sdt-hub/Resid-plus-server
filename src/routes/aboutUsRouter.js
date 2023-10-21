const express = require('express');
const router = express.Router();
const { createAboutUs, getAll, getAllForWebSite } = require("../controllers/aboutUsController");
const { isValidUser } = require('../middlewares/auth');


router.post('/', isValidUser, createAboutUs);
router.get('/resid-website', getAllForWebSite);
router.get('/', isValidUser, getAll);

module.exports = router;