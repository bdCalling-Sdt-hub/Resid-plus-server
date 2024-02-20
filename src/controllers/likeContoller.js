const logger = require("../helpers/logger");
const response = require("../helpers/response");
const Like = require("../models/Like");
const Residence = require("../models/Residence");

//Add booking
const upgradeLike = async (req, res) => {
  try {
    if(req.body.userRole !== 'user'){
      return res.status(403).json(
        response({
          status: 'Error',
          statusCode: '403',
          message: req.t('You are not authorized to like'),
        })
      );
    }
    const residence = await Residence.findById(req.body.residenceId);
    var like = await Like.findOne({userId: req.body.userId, residenceId: req.body.residenceId});
    var message
    if(like){
      await Like.findByIdAndDelete(like._id);
      message= req.t('Like removed successfully');
    }
    else{
      const newLike = new Like({
        residenceId: req.body.residenceId,
        userId: req.body.userId
      });
      await newLike.save();
      message= req.t('Like placed successfully');
    }
    const totalLikes = await Like.countDocuments({residenceId: req.body.residenceId});
    residence.likes = totalLikes;
    await residence.save();
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'like',
        message: message,
        data: residence,
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

module.exports = { upgradeLike};