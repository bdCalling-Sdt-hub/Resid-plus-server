const express = require('express');
const { signUp, signIn, processForgetPassword } = require('../controllers/userContoller');
const router = express.Router();

//Sign-up user
router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/forget/password', processForgetPassword);


module.exports = router;