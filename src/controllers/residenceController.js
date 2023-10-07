const response = require("../helpers/response");
const Residence = require("../models/Residence");
const User = require("../models/User");
//defining unlinking image function 
const unlinkImages = require('../common/image/unlinkImage')

//Add residence
const addResidence = async (req, res) => {
  try {
    const {
      residenceName,
      capacity,
      beds,
      baths,
      address,
      city,
      municipality,
      quirtier,
      aboutResidence,
      hourlyAmount,
      dailyAmount,
      amenities,
      ownerName,
      aboutOwner,
      category
    } = req.body;

    const checkHost = await User.findById(req.body.userId);

    if (!checkHost) {
      //deleting the images if user is not valid
      unlinkImages(req.files.map(file => file.path))
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };

    //extracting file names and path for static display with link
    const files = [];
    if (req.files) {
      req.files.forEach((file) => {
        const publicFileUrl = `${req.protocol}://${req.get('host')}/uploads/residences/${file.filename}`;
        files.push({
          publicFileUrl,
          path: file.path
        });
        console.log(files)
      });
    }

    if (checkHost.role === 'host') {
      const residence = new Residence({
        photo: files,
        residenceName,
        capacity,
        beds,
        baths,
        address,
        city,
        municipality,
        quirtier,
        aboutResidence,
        hourlyAmount,
        dailyAmount,
        amenities,
        ownerName,
        aboutOwner,
        hostId: req.body.userId,
        category
      });

      await residence.save();

      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'residence', message: 'Residence added successfully.', data: residence }));
    } else {
      //deleting the images if user is host
      unlinkImages(req.files.map(file => file.path))
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add residence' }));
    }

  } catch (error) {
    console.error(error);
    //deleting the images if something went wrong
    unlinkImages(req.files.map(file => file.path))
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
  }
};

//All residences
const allResidence = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });

    const search = req.query.search || '';
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const category = req.query.category || 'residence'
    const numberOfBeds = Number(req.query.numberOfBeds) || ''

    //minPrice must be greater or equal 1
    const minPrice = Number(req.query.minPrice) || '';
    const maxPrice = Number(req.query.maxPrice) || '';
    console.log(minPrice, maxPrice)
    const searchRegExp = new RegExp('.*' + search + '.*', 'i');
    const filter = {
      $or: [
        { residenceName: { $regex: searchRegExp } },
        { address: { $regex: searchRegExp } },
        { city: { $regex: searchRegExp } },
        { municipality: { $regex: searchRegExp } },
      ],
    };
    if (minPrice && maxPrice) {
      console.log('------enterend price------')
      filter.$and = filter.$and || [];
      filter.$and.push({ dailyAmount: { $gte: minPrice, $lte: maxPrice } })
    }
    if (category) {
      console.log('------enterend category------')
      filter.$and = filter.$and || [];
      filter.$and.push({ category: category });
    }

    if (numberOfBeds) {
      console.log('------enterend no..beds------')
      filter.$and = filter.$and || [];
      filter.$and.push({ beds: numberOfBeds });
    }

    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }

    let residences = [];
    let count = 0;

    if (checkUser.role === 'user' || checkUser.role === 'host') {
      const requestType = req.query.requestType || 'all'
      filter.$and = filter.$and || [];
      filter.$and.push({ status: 'active' });
      if (requestType === 'all') {
        residences = await Residence.find(filter)
          .limit(limit)
          .skip((page - 1) * limit);
        count = await Residence.countDocuments(filter);
      }
      else if (requestType === 'new') {
        residences = await Residence.find(filter)
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ createdAt: -1 });
        count = await Residence.countDocuments(filter);
      }
      else if (requestType === 'popular') {
        residences = await Residence.find(filter)
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ popularity: -1 });
        count = await Residence.countDocuments(filter);
      }
    }

    // //-> placed to residence dashboard API
    // else if (checkUser.role === 'admin') {
    //   residences = await Residence.find()
    //     .limit(limit)
    //     .skip((page - 1) * limit);
    //   count = await Residence.countDocuments();
    // }

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'residence',
        message: 'Residences retrieved successfully',
        data: {
          residences,
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
        message: 'Error getting residences',
      })
    );
  }
};
const allResidenceByHostId = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }

    let residences = [];
    let count = 0;
    if (checkUser.role !== 'host') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: 'You are not authorised to get your residences data',
        })
      );
    }
    else {
      residences = await Residence.find({
        hostId: req.body.userId,
      })
        .limit(limit)
        .skip((page - 1) * limit);
      count = await Residence.countDocuments({
        hostId: req.body.userId,
      });

      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '200',
          type: 'residence',
          message: 'Residences retrieved successfully',
          data: {
            residences,
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
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: 'Error getting residences',
      })
    );
  }
};



//Delete residences
const deleteResidence = async (req, res) => {
  try {
    const checkHost = await User.findById(req.body.userId);
    //extracting the residence id from param that is going to be deleted
    const id = req.params.id
    if (!checkHost) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkHost.role === 'host') {
      const images = await Residence.find({ _id: id })
        .select('photo')
        .exec();

      const paths = images.map(image =>
        image.photo.map(photoObject => photoObject.path)
      ).flat();
      unlinkImages(paths)
      console.log(paths);

      const residence = await Residence.findOneAndDelete(id);
      return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'residence', message: 'Residence deleted successfully.', data: residence }));
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add residence' }));
    }
  }
  catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error deleted residence' }));
  }
}

//Update residences
const updateResidence = async (req, res) => {
  console.log(req.body)
  try {
    const checkHost = await User.findById(req.body.userId);
    //extracting the residence id from param that is going to be edited
    const id = req.params.id
    const {
      residenceName,
      capacity,
      beds,
      baths,
      address,
      city,
      municipality,
      quirtier,
      aboutResidence,
      hourlyAmount,
      dailyAmount,
      amenities,
      ownerName,
      aboutOwner,
      status
    } = req.body;
    if (!checkHost) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkHost.role === 'host') {
      const residence = {
        residenceName,
        capacity,
        beds,
        baths,
        address,
        city,
        municipality,
        quirtier,
        aboutResidence,
        hourlyAmount,
        dailyAmount,
        amenities,
        ownerName,
        aboutOwner,
        hostId: req.body.userId,
      }
      if (status) {
        const existingResidence = await Residence.findById(id);
        if (existingResidence.status === 'reserved') {
          return res.status(403).json(response({ status: 'Error', statusCode: '403', message: 'You cant change staus while residence is reserved' }));
        }
        else {
          residence.status = status;
        }
      }
      if (req.files.length > 0) {
        const images = await Residence.find({ _id: id })
          .select('photo')
          .exec();
        const paths = images.map(image =>
          image.photo.map(photoObject => photoObject.path)
        ).flat();
        unlinkImages(paths)
        console.log(paths);

        const files = [];
        req.files.forEach((file) => {
          const publicFileUrl = `${req.protocol}://${req.get('host')}/uploads/residences/${file.filename}`;
          files.push({
            publicFileUrl,
            path: file.path
          });
          console.log(files)
        });
        residence.photo = files;
      }
      const options = { new: true };
      const result = await Residence.findByIdAndUpdate(id, residence, options);
      console.log(result)
      return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'residence', message: 'Residence edited successfully.', data: result }));
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add residence' }));
    }
  }
  catch (error) {
    console.error(error);
    //deleting the images if something went wrong
    if (req.files) {
      unlinkImages(req.files.map(file => file.path))
    }
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error added residence' }));
  }
}

//residences details
const residenceDetails = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    const id = req.params.id
    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }

    const residences = await Residence.findById(id);

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'residence',
        message: 'Residence retrieved successfully',
        data: {
          residences
        },
      })
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: 'Error getting residences',
      })
    );
  }
};

const residenceDashboard = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };

    if (checkUser.role === 'admin') {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const residences = await Residence.find()
        .limit(limit)
        .skip((page - 1) * limit);
      count = await Residence.countDocuments();

      const active = await Residence.countDocuments({ status: 'active' });
      const reserved = await Residence.countDocuments({ status: 'reserved' });
      console.log(active, reserved)
      const count_data = {
        active,
        reserved
      };
      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '200',
          type: 'residence',
          message: 'Residence count and details retrieved successfully',
          data: {
            residences,
            status: count_data,
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
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to get all counts' }));
    }
  }
  catch (error) {
    console.log(error)
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Server not responding' }));
  }
}


module.exports = { addResidence, allResidence, deleteResidence, updateResidence, residenceDetails, residenceDashboard, allResidenceByHostId };