const express = require('express');
const { allPromoCodes, deletePromoCode, updatePromoCode, addPromoCode, applyPromoCodes } = require('../controllers/promoCodeContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add residence
router.post('/',isValidUser, addPromoCode);
router.get('/', isValidUser, allPromoCodes);
router.put('/:id', isValidUser, updatePromoCode);
router.delete('/:id', isValidUser, deletePromoCode);
router.post('/apply', isValidUser, applyPromoCodes);


module.exports = router;