const express = require('express');
const { addFavourite, allFavourite, deleteFavourite } = require('../controllers/favouriteController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add favourite
router.post('/',isValidUser, addFavourite);
//get all favourite list
router.get('/', isValidUser, allFavourite);
//delete a particular list from favourite
router.delete('/:id',isValidUser, deleteFavourite);

module.exports = router;