const express = require('express');
const { addResidence, allResidence } = require('../controllers/residenceContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();
const userFileUploadMiddleware = require("../middlewares/fileUpload");

const UPLOADS_FOLDER_USERS = "./public/uploads/residences";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);

//Add residence
router.post('/', [uploadUsers.array("photo", 3)], isValidUser, addResidence);
router.get('/', isValidUser, allResidence);


module.exports = router;