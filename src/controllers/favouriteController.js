const response = require("../helpers/response");
const mongoose = require('mongoose')
const Favourite = require("../models/Favourite");
const Residence = require("../models/Residence");
const User = require("../models/User");

//Add favourite
const addFavourite = async (req, res) => {
  try {
    const { residenceId } = req.body;
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }
    const residence = await Residence.findById(residenceId)
    if (!residence || residence.isDeleted) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'Residence not found',
        })
      );
    }
    //checking there is same list exists?
    const favouriteItems = await Favourite.findOne({
      userId: checkUser._id,
      residenceId: residenceId
    });

    console.log(favouriteItems)
    if (favouriteItems) {
      return res.status(409).json(response({ status: 'Error', statusCode: '409', message: 'The item alrady exists in favourite list' }));
    }

    if (checkUser.role === 'user') {
      const favourite = new Favourite({
        residenceId,
        userId: checkUser._id
      });
      await favourite.save()
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'favourite', message: 'Favourite added successfully.', data: favourite }));
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add in favourite' }));
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error added favourite' }));
  }
};

//All favourites
const allFavourite = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId })
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

    let favourites = [];
    let count = 0;
    if (checkUser.role === 'user') {
      favourites = await Favourite.find({
        userId: checkUser._id
      })
        .populate('residenceId')
        .limit(limit)
        .skip((page - 1) * limit);
      count = await Favourite.countDocuments();
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to view favourite list' }));
    }

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'favourite',
        message: 'Favourites retrieved successfully',
        data: {
          favourites,
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
        message: 'Error getting favourites',
      })
    );
  }
};

//Delete Favourite
const deleteFavourite = async (req, res) => {
  try {
    const checkHost = await User.findById(req.body.userId);
    //extracting the favourite id from param that is going to be deleted
    const id = req.params.id
    if (!checkHost) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkHost.role === 'user') {
      const favourite = await Favourite.findOneAndDelete(id);
      return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'favourite', message: 'Item removed from Favourite successfully.', data: favourite }));
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to remove something from favourite' }));
    }
  }
  catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error in removing from favourite' }));
  }
}

module.exports = { addFavourite, allFavourite, deleteFavourite };