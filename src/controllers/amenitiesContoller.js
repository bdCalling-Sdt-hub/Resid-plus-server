const logger = require("../helpers/logger");
const response = require("../helpers/response");
const Amenity = require("../models/Amenity");
const User = require("../models/User");

//All amenitys
const allAmenity = async (req, res) => {
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

    const amenitys = await Amenity.find().select('translation');

    console.log("amenitys------------->", amenitys)
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'amenity',
        message: req.t('Amenitys retrieved successfully'),
        data: amenitys,
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting amenitys'),
      })
    );
  }
};

const addAmenity = async (req, res) => {
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
    const key = en.toLowerCase()

    if (user.role === 'user') {
      console.log("user.role------------->", user.role)
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'amenity', message: req.t('You are not Authorized') }));
    }

    // Check if an amenity entry already exists
    let amenity = await Amenity.findOne({ key: key });

    if (!amenity) {
      // If no entry exists, create a new one
      amenity = new Amenity({
        key: key,
        translation: {
          en: en,
          fr: fr
        }
      });
      await amenity.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'amenity', message: req.t('Amenity added successfully.'), data: amenity }));
    }

    // If an entry exists, update its content
    else {
      return res.status(201).json(response({ status: 'Error', statusCode: '201', type: 'amenity', message: req.t('Amenity already exists'), data: amenity }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'amenity', message: req.t('Server error') }));
  }
};

const addManyAmenity = async (req, res) => {
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'amenity', message: req.t('You are not Authorized') }));
    }
    const amenitiesToAdd = req.body;
    console.log("amenitiesToAdd------------->", amenitiesToAdd)

    // Assuming Amenity is your Mongoose model
    const result = await Amenity.insertMany(amenitiesToAdd);

    console.log(result);

    return res.status(200).json(response({ status: 'Success', message: 'Amenities added successfully', data: result }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'amenity', message: req.t('Server error') }));
  }
};

const deleteAmenity = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the deleteAmenity id from param that is going to be deleted
    const id = req.params.id
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (checkUser.role !== 'admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to delete amenity'),
        })
      );
    }
    const deleteAmenity = await Amenity.findOneAndDelete(id);
    return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'amenity', message: req.t('Amenity deleted successfully.'), data: deleteAmenity }));
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'amenity', message: req.t('Error deleted deleteAmenity') }));
  }
}

const updateAmenity = async (req, res) => {
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
          message: req.t('You are not authorised to update amenity'),
        })
      );
    }
    const id = req.params.id;
    const { en, fr } = req.body;
    const checkAmenity = await Amenity.findById(id);
    if (!checkAmenity) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Amenity not found') }));
    }
    else {
      key = en.toLowerCase()
      const aminity = {
        key: !en ? checkAmenity.key : key,
        translation: {
          en: !en ? checkAmenity.translation.en : en,
          fr: !fr ? checkAmenity.translation.fr : fr
        }
      }
      await Amenity.findByIdAndUpdate(id, aminity, { new: true });
      return res.status(201).json(response({ status: 'Updated', statusCode: '201', type: 'amenity', message: req.t('Amenity updated successfully.'), data: aminity }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'amenity', message: req.t('Error on updating amenity') }));
  }
}


module.exports = { allAmenity, deleteAmenity, updateAmenity, addAmenity, addManyAmenity };