const express = require('express');
const {  allIncomes  } = require('../controllers/incomeContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

router.get('/', isValidUser,allIncomes);

module.exports = router;