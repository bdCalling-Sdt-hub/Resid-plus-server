const express = require('express');
const { getNotificationDetails, allNotifications } = require('../controllers/notificationController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();


//Add notification
router.get('/', isValidUser, allNotifications);
router.patch('/:id', isValidUser, getNotificationDetails);


module.exports = router;