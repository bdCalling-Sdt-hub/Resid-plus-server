const logger = require("../helpers/logger");
const response = require("../helpers/response");
const Comment = require("../models/Comment");
const Residence = require("../models/Residence");

//Add booking
const addComment = async (req, res) => {
  try {
    if(req.body.userRole !== 'user'){
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
    const commentsCounts = await Comment.countDocuments({residenceId: residenceId});
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
  try{
    const residenceId = req.params.id;
    const comments = await Comment.find({residenceId: residenceId}).populate('userId', 'firstName lastName').populate('residenceId', 'residenceName');
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'comment',
        message: req.t('Comments fetched successfully'),
        data: comments,
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

module.exports = { addComment, getComments};