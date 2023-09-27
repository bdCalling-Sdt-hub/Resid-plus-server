const express = require('express');
const { addNotification, getAllNotification, updateNotification, allNotifications } = require('../controllers/notificationController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();


//Add notification
router.get('/', isValidUser, allNotifications);
router.put('/:id', isValidUser, updateNotification);


module.exports = router;