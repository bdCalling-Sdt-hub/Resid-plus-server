const express = require('express');
const { signUp, signIn, processForgetPassword, verifyOneTimeCode, updatePassword } = require('../controllers/userContoller');
const router = express.Router();

//Sign-up user
router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/forget/password', processForgetPassword);
router.post('/verify', verifyOneTimeCode);
router.post('/reset/password', updatePassword);


module.exports = router;