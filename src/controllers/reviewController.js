const response = require("../helpers/response");
const Residence = require("../models/Residence");
const Booking = require('../models/Booking')
const Review = require("../models/Review");
const User = require("../models/User");
const logger = require("../helpers/logger");

const giveReview = async (req, res) => {
  try {
    const { bookingId,rating } = req.body;
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser || checkUser.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }
    // const user = req.body.userId;

    const bookingDetails = await Booking.findById(bookingId);
    if(!bookingDetails){
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Booking details not found'),
        })
      );
    }

    if (Number(rating) > 5) {
      return res.status(201).json(
        response({
          status: 'Error',
          statusCode: '201',
          message: req.t('Review Rating Must be 5*'),
        })
      );
    }

    const existingReview = await Review.findOne({userId: checkUser._id,  residenceId: bookingDetails.residenceId})
    if(existingReview){
      return res.status(201).json(
        response({
          status: 'Error',
          statusCode: '201',
          message: req.t('Review already exists'),
        })
      );
    }

    if (checkUser.role !== 'user') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not authorised to give review'),
        })
      );
    }
    console.log("hello------------->",bookingDetails.userId.toString(), req.body.userId.toString())
    if (bookingDetails.userId.toString() === req.body.userId.toString()) {
      if (bookingDetails.status === "check-out") {
        const review = await Review.create({
          userId: req.body.userId,
          residenceId: bookingDetails.residenceId,
          rating: Number(rating),
        })
        const residenceId = bookingDetails.residenceId
        const allratings = await Review.find({ residenceId: residenceId });
        if (allratings.length > 0) {
          const totalRatings = allratings.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = totalRatings / allratings.length;

          console.log(`The average rating is: ${averageRating}`);
          const residence = {
            ratings: averageRating
          }
          const options = { new: true };
          await Residence.findByIdAndUpdate(residenceId, residence, options);
        } else {
          console.log('No ratings found.');
        }

        return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'review', message: req.t('Review added successfully.'), data: review }));
      }
      else{
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'review', message: req.t('You can not review the residence as it is not completed yet') }));
      }
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'review', message: req.t('You are not authorised to review the residence') }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'review', message: req.t('Error adding review') }));
  }
};

const getAll = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    const residenceId = req.params.residenceId
    if (!checkUser || checkUser.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    if (checkUser.role === 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('You are authorised to view ratings'),
        })
      );
    }
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const reviews = await Review.find({ residenceId: residenceId }).populate('userId','fullName').sort({rating: -1}).limit(limit);
    return res.status(200).json(response({ status: 'Success', statusCode: '200', type: 'review', message: req.t('Review retrived successfully'), data: reviews }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'review', message: req.t('Error in getting reviews') }));
  }
};



module.exports = { giveReview, getAll };