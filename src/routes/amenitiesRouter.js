const express = require('express');
const { allAmenity, deleteAmenity, updateAmenity, addAmenity, addManyAmenity } = require('../controllers/amenitiesContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add residence
router.post('/',isValidUser, addAmenity);
router.post('/add-multiple',isValidUser, addManyAmenity);
router.get('/', isValidUser, allAmenity);
router.put('/:id', isValidUser, updateAmenity);
router.delete('/:id', isValidUser, deleteAmenity);

module.exports = router;