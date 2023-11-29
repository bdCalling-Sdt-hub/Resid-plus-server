const logger = require("../helpers/logger");
const response = require("../helpers/response");
const Country = require("../models/Country");
const User = require("../models/User");

//All countrys
const allCountry = async (req, res) => {
  try {
    const countrys = await Country.find().select('countryName countryCode');
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'country',
        message: req.t('Countrys retrieved successfully'),
        data: countrys,
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting countrys'),
      })
    );
  }
};

const addCountry = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user || user.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const { countryName, countryCode } = req.body;

    if (user.role === 'user') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'country', message: req.t('You are not Authorized') }));
    }

    // Check if an country entry already exists
    let country = await Country.findOne({ countryName: countryName, countryCode: countryCode });

    if (!country) {
      // If no entry exists, create a new one
      country = new Country({
        countryName: countryName,
        countryCode: countryCode,
      });
      await country.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'country', message: req.t('Country added successfully.'), data: country }));
    }

    // If an entry exists, update its content
    else {
      return res.status(201).json(response({ status: 'Error', statusCode: '201', type: 'country', message: req.t('Country already exists'), data: country }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'country', message: req.t('Server error') }));
  }
};

const addManyCountry = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user || user.status!=='accepted') {
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'country', message: req.t('You are not Authorized') }));
    }
    const countriesToAdd = req.body;

    // Assuming Country is your Mongoose model
    const result = await Country.insertMany(countriesToAdd);

    console.log(result);

    return res.status(200).json(response({ status: 'Success', message: 'Categories added successfully', data: result }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message, error.code);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'country', message: req.t('Server error') }));
  }
};

const deleteCountry = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the deleteCountry id from param that is going to be deleted
    const id = req.params.id
    if (!checkUser || checkUser.status!=='accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (checkUser.role !== 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to delete country'),
        })
      );
    }
    const deleteCountry = await Country.findOneAndDelete(id);
    return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'country', message: req.t('Country deleted successfully.'), data: deleteCountry }));
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'country', message: req.t('Error deleted deleteCountry') }));
  }
}

const updateCountry = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user || user.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }
    if (user.role !== 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to update country'),
        })
      );
    }
    const id = req.params.id;
    const { en, fr } = req.body;
    const checkCountry = await Country.findById(id);
    if (!checkCountry) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Country not found') }));
    }
    else {
      key = en.toLowerCase()
      const aminity = {
        key: !en ? checkCountry.key : key,
        translation: {
          en: !en ? checkCountry.translation.en : en,
          fr: !fr ? checkCountry.translation.fr : fr
        }
      }
      await Country.findByIdAndUpdate(id, aminity, { new: true });
      return res.status(201).json(response({ status: 'Updated', statusCode: '201', type: 'country', message: req.t('Country updated successfully.'), data: aminity }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'country', message: req.t('Error on updating country') }));
  }
}


module.exports = { allCountry, deleteCountry, updateCountry, addCountry, addManyCountry };