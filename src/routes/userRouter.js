const express = require('express');
const { signUp, signIn, processForgetPassword, verifyOneTimeCode, updatePassword } = require('../controllers/userContoller');
const router = express.Router();
const userFileUploadMiddleware = require("../middlewares/fileUpload");

const UPLOADS_FOLDER_USERS = "./public/uploads/users";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);

//Sign-up user
router.post('/signup', [uploadUsers.single("image")], signUp);
router.post('/signin', signIn);
router.post('/forget/password', processForgetPassword);
router.post('/verify', verifyOneTimeCode);
router.post('/reset/password', updatePassword);


module.exports = router;