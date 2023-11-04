const express = require('express');
const { allAmenity, deleteAmenity, updateAmenity, addAmenity, addManyAmenity } = require('../controllers/amenitiesContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();
const userFileUploadMiddleware = require("../middlewares/fileUpload");
//middleware to check if req.files is empty or not
const imageVerification = require('../middlewares/fileVerifcation')
const validateResidenceMiddleware = require('../middlewares/residence/residenceValidator');

const UPLOADS_FOLDER_USERS = "./public/uploads/residences";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);

//Add residence
router.post('/',isValidUser, addAmenity);
router.post('/add-multiple',isValidUser, addManyAmenity);
router.get('/', isValidUser, allAmenity);
router.put('/:id', isValidUser, updateAmenity);
router.delete('/:id', isValidUser, deleteAmenity);

module.exports = router;