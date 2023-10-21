const express = require('express');
const router = express.Router();
const { createFaq, getAll, deleteFaq, updateFaq, getFaqById, getAllForWebSite } = require("../controllers/faqController");
const { isValidUser } = require('../middlewares/auth');


router.post('/', isValidUser, createFaq);
router.get('/resid-website', getAllForWebSite);
router.get('/', isValidUser, getAll);
router.put('/:id', isValidUser, updateFaq);
router.get('/:id', isValidUser, getFaqById);
router.delete('/:id', isValidUser, deleteFaq);

module.exports = router;