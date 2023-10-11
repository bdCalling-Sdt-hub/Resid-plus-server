const express = require('express');
const { giveReview, getAll } = require('../controllers/reviewController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();


router.post('/',isValidUser, giveReview);
router.get('/:residenceId', isValidUser, getAll);

module.exports = router;