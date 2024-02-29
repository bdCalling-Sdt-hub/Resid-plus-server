const express = require('express');
const { addComment, getComments } = require('../controllers/commentsContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add residence
router.post('/',isValidUser, addComment);
router.get('/:id', getComments);

module.exports = router;