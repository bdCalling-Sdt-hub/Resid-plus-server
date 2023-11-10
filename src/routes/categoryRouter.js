const express = require('express');
const { allCategory, deleteCategory, updateCategory, addCategory, addManyCategory } = require('../controllers/categoryContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add residence
router.post('/',isValidUser, addCategory);
router.post('/add-multiple',isValidUser, addManyCategory);
router.get('/', isValidUser, allCategory);
router.put('/:id', isValidUser, updateCategory);
router.delete('/:id', isValidUser, deleteCategory);

module.exports = router;