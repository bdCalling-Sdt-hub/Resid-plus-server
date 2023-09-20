const express = require('express');
const { signUp, signIn, processForgetPassword, verifyOneTimeCode, updatePassword, updateProfile, userDetails } = require('../controllers/userContoller');
const router = express.Router();
const userFileUploadMiddleware = require("../middlewares/fileUpload");

const UPLOADS_FOLDER_USERS = "./public/uploads/users";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);
const { isValidUser } = require('../middlewares/auth')

//Sign-up user
router.post('/signup',signUp);
router.post('/signin', signIn);
router.post('/forget/password', processForgetPassword);
router.post('/verify', verifyOneTimeCode);
router.post('/reset/password', updatePassword);
router.put('/',[uploadUsers.single("image")],isValidUser,updateProfile);
router.get('/:id',isValidUser,userDetails);


module.exports = router;