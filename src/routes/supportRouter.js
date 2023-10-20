const express = require('express');
const router = express.Router();
const { createSupport, getAll } = require("../controllers/supportController");
const { isValidUser } = require('../middlewares/auth');


router.post('/', isValidUser, createSupport);
router.get('/', isValidUser, getAll);

module.exports = router;