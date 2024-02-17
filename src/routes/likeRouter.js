const express = require('express');
const { upgradeLike } = require('../controllers/likeContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add residence
router.post('/',isValidUser, upgradeLike);

module.exports = router;