const response = require("../helpers/response");
const Activity = require("../models/Activity");
const User = require("../models/User");

//All activitys
const allActivity = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    if (checkUser.role !== 'admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: 'You are not authorised to get login activity',
        })
      );
    }

    const activitys = await Activity.find()
      .limit(limit)
      .skip((page - 1) * limit)
    count = await Activity.countDocuments();

    console.log("activitys------------->", activitys)
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'activity',
        message: 'Activitys retrieved successfully',
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
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: 'Error getting activitys',
      })
    );
  }
};

const deleteActivity = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the deleteActivity id from param that is going to be deleted
    const id = req.params.id
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkUser.role !== 'admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: 'You are not authorised to delete login activity',
        })
      );
    }
    const deleteActivity = await Activity.findOneAndDelete(id);
    return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'activity', message: 'Activity deleted successfully.', data: deleteActivity }));
  }
  catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'activity',message: 'Error deleted deleteActivity' }));
  }
}

module.exports = { allActivity, deleteActivity };