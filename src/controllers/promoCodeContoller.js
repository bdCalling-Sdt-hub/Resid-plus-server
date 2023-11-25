const logger = require("../helpers/logger");
const response = require("../helpers/response");
const AppliedPromoCodes = require("../models/AppliedPromoCodes");
const Booking = require("../models/Booking");
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");

//All promoCodes
const allPromoCodes = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    if (checkUser.role !== 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to get all promo-codes'),
        })
      );
    }

    const promoCodes = await PromoCode.find();

    console.log("promoCodes------------->", promoCodes)
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'promoCode',
        message: req.t('PromoCodes retrieved successfully'),
        data: promoCodes,
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting promoCodes'),
      })
    );
  }
};

const addPromoCode = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user || user.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    var { title, discountPercentage, expiryDate, isActive, couponCode } = req.body;
    if (!title || discountPercentage===null || !expiryDate || isActive===null || !couponCode) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Please fill all the fields'),
        })
      );
    }

    const currentDate = new Date();
    const inputExpiryDate = new Date(expiryDate);

    if (
      isNaN(inputExpiryDate) ||
      inputExpiryDate < currentDate // Ensure expiryDate is in the future
    ) {
      return res.status(400).json(
        response({
          status: 'Error',
          statusCode: '400',
          message: req.t('Expiry date should be a valid future date'),
        })
      );
    }

    if (user.role !== 'super-admin') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'promoCode', message: req.t('You are not Authorized') }));
    }

    // Check if an promoCode entry already exists
    let promoCode = await PromoCode.findOne({ couponCode: couponCode });
    console.log("existing data------------>", promoCode)

    if (!promoCode) {
      // If no entry exists, create a new one
      //console.log("couponCode------------->", couponCode)
      const newPomoCode = {
        title: title,
        discountPercentage: discountPercentage,
        expiryDate: expiryDate,
        isActive: isActive,
        couponCode: couponCode
      };
      //console.log("promoCode------------->", newPomoCode)
      const data = await PromoCode.create(newPomoCode);
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'promoCode', message: req.t('PromoCode added successfully.'), data: data }));
    }

    // If an entry exists, update its content
    else {
      return res.status(201).json(response({ status: 'Error', statusCode: '201', type: 'promoCode', message: req.t('PromoCode already exists'), data: promoCode }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'promoCode', message: error.message }));
  }
};

const deletePromoCode = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the deletePromoCode id from param that is going to be deleted
    const id = req.params.id
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (checkUser.role !== 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to delete promoCode'),
        })
      );
    }
    const deletePromoCode = await PromoCode.findOneAndDelete(id);
    return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'promoCode', message: req.t('PromoCode deleted successfully.'), data: deletePromoCode }));
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'promoCode', message: req.t('Error deleted deletePromoCode') }));
  }
}

const updatePromoCode = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user || user.status !== 'accepted') {
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
          message: req.t('You are not authorised to update promoCode'),
        })
      );
    }
    const id = req.params.id;
    const checkPromoCode = await PromoCode.findById(id);

    if (!checkPromoCode) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('PromoCode not found') }));
    }
    else {
      const { title, discountPercentage, expiryDate, isActive, } = req.body;
      const promoCode = {
        title: !title ? checkPromoCode.title : title,
        discountPercentage: !discountPercentage ? checkPromoCode.discountPercentage : discountPercentage,
        expiryDate: !expiryDate ? checkPromoCode.expiryDate : expiryDate,
        isActive: !isActive ? checkPromoCode.isActive : isActive
      }
      await PromoCode.findByIdAndUpdate(id, promoCode, { new: true });
      return res.status(201).json(response({ status: 'Updated', statusCode: '201', type: 'promoCode', message: req.t('PromoCode updated successfully.'), data: promoCode }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'promoCode', message: req.t('Error on updating promoCode') }));
  }
}

const applyPromoCodes = async (req, res) => {
  try{
    const { couponCode, bookingId } = req.body;
    const checkUser = await User.findById(req.body.userId);
    const promoCode = await PromoCode.findOne({ couponCode: couponCode });
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if(checkUser.role !== 'user'){
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to apply promoCode') }));
    }

    const existingAppliedPromoCode = await AppliedPromoCodes.findOne({ user: req.body.userId, promoCode: promoCode._id });

    if(existingAppliedPromoCode){
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('You have already used this promo-code') }));
    }

    //only user can apply promoCode
    if(!couponCode || !bookingId){
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Please fill required fields') }));
    }

    const bookingDetails = await Booking.findById(bookingId);
    if(!bookingDetails){
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Booking not found') }));
    }

    if(!promoCode){
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Promo-code not found') }));
    }

    const currentDate = new Date();
    const expiryDate = new Date(promoCode.expiryDate);
    if(expiryDate < currentDate || !promoCode.isActive){
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Promo-code already expired') }));
    }

    const discountPercentage = promoCode.discountPercentage;
    const totalAmount = bookingDetails.serviceCharge;
    const discountAmount = Math.ceil((totalAmount * discountPercentage)/100);
    bookingDetails.discount = discountAmount;
    bookingDetails.totalAmount = totalAmount - discountAmount;
    await bookingDetails.save();

    const appliedPromoCode = new AppliedPromoCodes({
      user: req.body.userId,
      promoCode: promoCode._id,
    });
    await appliedPromoCode.save();
    return res.status(201).json(response({ status: 'Updated', statusCode: '201', type: 'promoCode', message: req.t('PromoCode applied successfully.'), data: bookingDetails }));
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'promoCode', message: req.t('Error on updating promoCode') }));
  }
}

module.exports = { allPromoCodes, deletePromoCode, updatePromoCode, addPromoCode, applyPromoCodes };