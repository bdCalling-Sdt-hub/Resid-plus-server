const logger = require("../helpers/logger");
const response = require("../helpers/response");
const Category = require("../models/Category");
const User = require("../models/User");

//All categorys
const allCategory = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    // if (checkUser.role !== 'user' && checkUser.role !== 'admin') {
    //   return res.status(401).json(
    //     response({
    //       status: 'Error',
    //       statusCode: '401',
    //       message: req.t('You are not authorised to get amenities'),
    //     })
    //   );
    // }

    const categorys = await Category.find().select('translation');

    console.log("categorys------------->", categorys)
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'category',
        message: req.t('Categorys retrieved successfully'),
        data: categorys,
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting categorys'),
      })
    );
  }
};

const addCategory = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const { en, fr } = req.body;
    const key = en.toLowerCase().replace(/ /g, '-'); // Replace spaces with hyphens

    if (user.role === 'user') {
      console.log("user.role------------->", user.role)
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'category', message: req.t('You are not Authorized') }));
    }

    // Check if an category entry already exists
    let category = await Category.findOne({ key: key });

    if (!category) {
      // If no entry exists, create a new one
      category = new Category({
        key: key,
        translation: {
          en: en,
          fr: fr
        }
      });
      await category.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'category', message: req.t('Category added successfully.'), data: category }));
    }

    // If an entry exists, update its content
    else {
      return res.status(201).json(response({ status: 'Error', statusCode: '201', type: 'category', message: req.t('Category already exists'), data: category }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'category', message: req.t('Server error') }));
  }
};

const addManyCategory = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    if (user.role === 'user') {
      console.log("user.role------------->", user.role)
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'category', message: req.t('You are not Authorized') }));
    }
    const amenitiesToAdd = req.body;

    // Assuming Category is your Mongoose model
    const result = await Category.insertMany(amenitiesToAdd);

    console.log(result);

    return res.status(200).json(response({ status: 'Success', message: 'Categories added successfully', data: result }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message, error.code);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'category', message: req.t('Server error') }));
  }
};

const deleteCategory = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the deleteCategory id from param that is going to be deleted
    const id = req.params.id
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (checkUser.role !== 'admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to delete category'),
        })
      );
    }
    const deleteCategory = await Category.findOneAndDelete(id);
    return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'category', message: req.t('Category deleted successfully.'), data: deleteCategory }));
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'category', message: req.t('Error deleted deleteCategory') }));
  }
}

const updateCategory = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }
    if (user.role !== 'admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to update category'),
        })
      );
    }
    const id = req.params.id;
    const { en, fr } = req.body;
    const checkCategory = await Category.findById(id);
    if (!checkCategory) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Category not found') }));
    }
    else {
      key = en.toLowerCase()
      const aminity = {
        key: !en ? checkCategory.key : key,
        translation: {
          en: !en ? checkCategory.translation.en : en,
          fr: !fr ? checkCategory.translation.fr : fr
        }
      }
      await Category.findByIdAndUpdate(id, aminity, { new: true });
      return res.status(201).json(response({ status: 'Updated', statusCode: '201', type: 'category', message: req.t('Category updated successfully.'), data: aminity }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'category', message: req.t('Error on updating category') }));
  }
}


module.exports = { allCategory, deleteCategory, updateCategory, addCategory, addManyCategory };