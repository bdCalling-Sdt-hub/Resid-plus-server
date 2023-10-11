const express = require('express');
const router = express.Router();
const { createFaq, getAll, deleteFaq, updateFaq, getFaqById } = require("../controllers/faqController");
const { isValidUser } = require('../middleWares/auth');


router.post('/', isValidUser, createFaq);
router.get('/', isValidUser, getAll);
router.put('/:id', isValidUser, updateFaq);
router.get('/:id', isValidUser, getFaqById);
router.delete('/:id', isValidUser, deleteFaq);

module.exports = router;