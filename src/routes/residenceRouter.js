const express = require('express');
const { addResidence, allResidence, deleteResidence, updateResidence, residenceDetails, residenceDashboard, allResidenceByHostId } = require('../controllers/residenceController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();
const userFileUploadMiddleware = require("../middlewares/fileUpload");
//middleware to check if req.files is empty or not
const imageVerification = require('../middlewares/fileVerifcation')


const UPLOADS_FOLDER_USERS = "./public/uploads/residences";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);


//Add residence
router.post('/', [uploadUsers.array("photo", 3)], imageVerification, isValidUser, addResidence);
router.get('/', isValidUser, allResidence);
router.get('/by-host', isValidUser, allResidenceByHostId);
router.put('/:id', [uploadUsers.array("photo", 3)], isValidUser, updateResidence);
router.delete('/:id', isValidUser, deleteResidence);
router.get('/:id', isValidUser, residenceDetails);
router.get('/dashboard/status', isValidUser, residenceDashboard);


module.exports = router;