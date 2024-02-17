const express = require('express');
const {  allIncomes, getAllIncomes  } = require('../controllers/incomeContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

router.get('/', isValidUser,allIncomes);
router.get('/all', getAllIncomes);

module.exports = router;