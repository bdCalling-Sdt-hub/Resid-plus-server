const express = require('express');
const { addResidence, allResidence, deleteResidence, updateResidence, residenceDetails, residenceDashboard, searchCredentials, blockedResidenceUpdate, allResidenceForUser } = require('../controllers/residenceController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();
const userFileUploadMiddleware = require("../middlewares/fileUpload");
//middleware to check if req.files is empty or not
const imageVerification = require('../middlewares/fileVerifcation')
const validateResidenceMiddleware = require('../middlewares/residence/residenceValidator');

const UPLOADS_FOLDER_USERS = "./public/uploads/residences";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);

//Add residence
router.post('/',[uploadUsers.array("photo", 5)], imageVerification, validateResidenceMiddleware,isValidUser, addResidence);
router.get('/user', allResidenceForUser);
router.get('/', isValidUser, allResidence);
router.put('/:id', [uploadUsers.array("photo", 5)], isValidUser, updateResidence);
router.put('/:id/re-uploaded', [uploadUsers.array("photo", 5)], isValidUser, blockedResidenceUpdate);
router.delete('/:id', isValidUser, deleteResidence);
router.get('/search-credentials', isValidUser, searchCredentials);
router.get('/:id', residenceDetails);
router.get('/dashboard/status', isValidUser, residenceDashboard);


module.exports = router;