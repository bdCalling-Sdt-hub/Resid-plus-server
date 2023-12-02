const express = require('express');
const { signUp, signIn, processForgetPassword, changePassword, verifyOneTimeCode, updatePassword, updateProfile, userDetails, allUser,resendOneTimeCode, updateUserStatus, createUser, deleteAccount } = require('../controllers/userController');
const router = express.Router();
const userFileUploadMiddleware = require("../middlewares/fileUpload");

const UPLOADS_FOLDER_USERS = "./public/uploads/users";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);
const { isValidUser } = require('../middlewares/auth')
const  validationMiddleware = require('../middlewares/user/signupValidation');

//Sign-up user
router.post('/signup',  validationMiddleware, signUp);
router.post('/signin', signIn);
router.post('/forget/password', processForgetPassword);
router.post('/resend-onetime-code', resendOneTimeCode);
router.post('/verify', verifyOneTimeCode);
router.post('/reset/password', updatePassword);
router.post('/add-user', isValidUser,createUser)
router.patch('/', isValidUser, changePassword);
router.patch('/update-status/:id', isValidUser, updateUserStatus);
router.put('/', [uploadUsers.single("image")], isValidUser, updateProfile);
router.get('/:id', isValidUser, userDetails);
router.get('/', isValidUser, allUser);
router.delete('/', isValidUser, deleteAccount);


module.exports = router;