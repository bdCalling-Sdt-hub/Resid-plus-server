const express = require('express');
const { allCountry, deleteCountry, updateCountry, addCountry, addManyCountry } = require('../controllers/countryContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add residence
router.post('/',isValidUser, addCountry);
router.post('/add-multiple',isValidUser, addManyCountry);
router.get('/', allCountry);
router.put('/:id', isValidUser, updateCountry);
router.delete('/:id', isValidUser, deleteCountry);

module.exports = router;