const express = require('express');
const { addResidence, allResidences } = require('../controllers/residenceContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add residence
router.post('/', isValidUser, addResidence);
router.get('/', isValidUser, allResidences);


module.exports = router;