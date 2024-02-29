const express = require('express');
const { addEvent, getEvents, deleteEvent } = require('../controllers/eventController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();
const userFileUploadMiddleware = require("../middlewares/fileUpload");
const fs = require('fs');

const UPLOADS_FOLDER_USERS = "./public/uploads/events";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);
const convertHeicToPng = require('../middlewares/converter'); // Updated import statement for the converter middleware

if (!fs.existsSync(UPLOADS_FOLDER_USERS)) {
  // If not, create the folder
  fs.mkdirSync(UPLOADS_FOLDER_USERS, { recursive: true }, (err) => {
      if (err) {
          console.error("Error creating uploads folder:", err);
      } else {
          console.log("Uploads folder created successfully");
      }
  });
} else {
  console.log("Uploads folder already exists");
}

//Add residence
router.post('/', [uploadUsers.single("image")], convertHeicToPng(UPLOADS_FOLDER_USERS), isValidUser,addEvent);
router.get('/', isValidUser, getEvents);
router.delete('/:id', isValidUser, deleteEvent);

module.exports = router;