const logger = require("../helpers/logger");
const response = require("../helpers/response");
const Comment = require("../models/Comment");
const Residence = require("../models/Residence");

//Add booking
const addComment = async (req, res) => {
  try {
    if (req.body.userRole !== 'user') {
      return res.status(403).json(
        response({
          status: 'Error',
          statusCode: '403',
          message: req.t('You are not authorized to do comment'),
        })
      );
    }
    let {
      residenceId,
      comment,
    } = req.body;
    const residence = await Residence.findById(residenceId);
    if (!residence) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Residence not found'),
        })
      );
    }
    const newComment = new Comment({
      residenceId,
      comment,
      userId: req.body.userId
    });
    await newComment.save();
    const commentsCounts = await Comment.countDocuments({ residenceId: residenceId });
    residence.comments = commentsCounts;
    await residence.save();

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'comment',
        message: req.t('Comment placed successfully'),
        data: newComment,
      })
    );
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error)
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Internal server error'),
      })
    );
  }
}

const getComments = async (req, res) => {
  try {
    const residenceId = req.params.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ residenceId: residenceId }).populate('userId', 'fullName image').skip(skip).limit(limit);
    const totalDocuments = await Comment.countDocuments({ residenceId: residenceId });
    const totalPages = Math.ceil(totalDocuments / limit);
    const pagination = {
      totalDocuments,
      totalPages,
      currentPage: page,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < Math.ceil(totalDocuments / limit) ? page + 1 : null,
      limit
    }
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'comment',
        message: req.t('Comments fetched successfully'),
        data: { comments, pagination },
      })
    );
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error)
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Internal server error'),
      })
    );
  }
}

module.exports = { addComment, getComments };