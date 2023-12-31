const logger = require("../helpers/logger");
const response = require("../helpers/response");
const Activity = require("../models/Activity");
const User = require("../models/User");

//All activitys
const allActivity = async (req, res) => {
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

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    if (checkUser.role !== 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to get login activity'),
        })
      );
    }

    const activitys = await Activity.find()
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({createdAt:-1})
    count = await Activity.countDocuments();

    console.log("activitys------------->", activitys)
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'activity',
        message: req.t('Activitys retrieved successfully'),
        data: {
          activitys,
          pagination: {
            totalDocuments: count,
            totalPage: Math.ceil(count / limit),
            currentPage: page,
            previousPage: page > 1 ? page - 1 : null,
            nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
          },
        },
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting activitys'),
      })
    );
  }
};

const deleteActivity = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the deleteActivity id from param that is going to be deleted
    const id = req.params.id
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (checkUser.role !== 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('You are not authorised to delete login activity'),
        })
      );
    }
    const deleteActivity = await Activity.findOneAndDelete(id);
    return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'activity', message: req.t('Activity deleted successfully.'), data: deleteActivity }));
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'activity',message: req.t('Error deleted deleteActivity') }));
  }
}

module.exports = { allActivity, deleteActivity };