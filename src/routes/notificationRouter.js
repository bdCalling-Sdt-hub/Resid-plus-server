const express = require('express');
const { getNotification, allNotifications } = require('../controllers/notificationController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();


//Add notification
router.get('/', isValidUser, allNotifications);
router.patch('/:id', isValidUser, getNotification);


module.exports = router;