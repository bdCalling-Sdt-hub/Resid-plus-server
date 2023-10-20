const response = require("../helpers/response");
const Residence = require("../models/Residence");
const Booking = require('../models/Booking')
const User = require("../models/User");
const mongoose = require('mongoose');
//defining unlinking image function 
const unlinkImages = require('../common/image/unlinkImage');
const { addNotification, getAllNotification } = require("./notificationController");

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
      const message = checkHost.fullName + ' has added ' + residence.residenceName
      const newNotification = {
        message: message,
        image: checkHost.image,
        linkId: residence._id,
        type: 'residence',
        role: 'admin'
      }
      await addNotification(newNotification)
      const notification = await getAllNotification('admin', 10, 1)
      io.emit('admin-notification', notification);

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
    const category = req.query.category || ''
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
      //console.log('------enterend price------')
      filter.$and = filter.$and || [];
      filter.$and.push({ dailyAmount: { $gte: minPrice, $lte: maxPrice } })
    }
    if (category) {
      //console.log('------enterend category------')
      filter.$and = filter.$and || [];
      filter.$and.push({ category: category });
    }

    if (numberOfBeds) {
      //console.log('------enterend no..beds------')
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

    if (checkUser.role === 'user') {
      const requestType = req.query.requestType || 'all'
      if (requestType === 'all') {
        residences = await Residence.find({ isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit);
        count = await Residence.countDocuments({ isDeleted: false, ...filter });
      }
      else if (requestType === 'new') {
        residences = await Residence.find({ isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ createdAt: -1 });
        count = await Residence.countDocuments({ isDeleted: false, ...filter });
      }
      else if (requestType === 'popular') {
        residences = await Residence.find({ isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ popularity: -1 });
        count = await Residence.countDocuments({ isDeleted: false, ...filter });
      }
    }
    else if (checkUser.role === 'host') {
      const requestType = req.query.requestType || 'all'
      if (requestType === 'all') {
        residences = await Residence.find({ hostId: checkUser._id,isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit);
        count = await Residence.countDocuments({ hostId: checkUser._id,isDeleted: false, ...filter });
      }
      else if (requestType === 'new') {
        residences = await Residence.find({ hostId: checkUser._id,isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ createdAt: -1 });
        count = await Residence.countDocuments({ hostId: checkUser._id,isDeleted: false, ...filter });
      }
      else if (requestType === 'popular') {
        residences = await Residence.find({ hostId: checkUser._id,isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ popularity: -1 });
        count = await Residence.countDocuments({ hostId: checkUser._id,isDeleted: false, ...filter });
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

// const allResidenceByHostId = async (req, res) => {
//   try {
//     const checkUser = await User.findOne({ _id: req.body.userId });
//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 10;
//     const search = req.query.search || '';
//     const searchRegExp = new RegExp('.*' + search + '.*', 'i');
//     const filter = {
//       $or: [
//         { residenceName: { $regex: searchRegExp } },
//         { address: { $regex: searchRegExp } },
//         { city: { $regex: searchRegExp } },
//         { municipality: { $regex: searchRegExp } },
//       ],
//     };
//     if (!checkUser) {
//       return res.status(404).json(
//         response({
//           status: 'Error',
//           statusCode: '404',
//           message: 'User not found',
//         })
//       );
//     }

//     let residences = [];
//     let count = 0;
//     if (checkUser.role !== 'host') {
//       return res.status(401).json(
//         response({
//           status: 'Error',
//           statusCode: '401',
//           message: 'You are not authorised to get your residences data',
//         })
//       );
//     }
//     else {
//       residences = await Residence.find({
//         hostId: req.body.userId,
//         isDeleted: false,
//         ...filter
//       })
//         .limit(limit)
//         .skip((page - 1) * limit);
//       count = await Residence.countDocuments({
//         hostId: req.body.userId,
//         isDeleted: false,
//         ...filter
//       });

//       return res.status(200).json(
//         response({
//           status: 'OK',
//           statusCode: '200',
//           type: 'residence',
//           message: 'Residences retrieved successfully',
//           data: {
//             residences,
//             pagination: {
//               totalDocuments: count,
//               totalPage: Math.ceil(count / limit),
//               currentPage: page,
//               previousPage: page > 1 ? page - 1 : null,
//               nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
//             },
//           },
//         })
//       );
//     }
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json(
//       response({
//         status: 'Error',
//         statusCode: '500',
//         message: 'Error getting residences',
//       })
//     );
//   }
// };

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
      const residenceDetails = await Residence.findOne({ _id: id })
      if(!residenceDetails){
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Residence not found' }));
      }
      if(residenceDetails.hostId._id.toString() !== req.body.userId.toString()){
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to delete this residence' }));
      }
      if(residenceDetails.status === 'reserved'){
        return res.status(403).json(response({ status: 'Error', statusCode: '403', message: 'You cant delete residence while it is reserved' }));
      }
      if (!residenceDetails.isDeleted  && residenceDetails.status !== 'reserved') {
        const today = new Date();
        const futureBookings = await Booking.findOne({
          residenceId: id,
          startDate: { $gte: today },
          status: { $ne: 'pending' }
        });

        if (futureBookings) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', type: 'residence', message: 'Cannot delete residence with future booking requests accepted.' }));
        }
        //console.log('images to be deleted-------------->',residenceDetails.photo)
        const paths = residenceDetails.photo.map(photoObject => photoObject.path).flat();
        unlinkImages(paths)
        residenceDetails.isDeleted = true;
        residenceDetails.save();
        await Booking.updateMany({ residenceId: id }, { $set: { isDeleted: true } });
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'residence', message: 'Residence deleted successfully.', data: residenceDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "residence", message: 'Delete credentials not match' }));
      }
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to delete residence' }));
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
      if (req.files.length > 0) {
        unlinkImages(req.files.map(file => file.path))
      }
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    const existingResidence = await Residence.findById(id);
    if (checkHost.role === 'host' && checkHost._id.toString() === existingResidence.hostId.toString()) {
      const updatedResidence = {
        residenceName: !residenceName?existingResidence.residenceName:residenceName,
        capacity: !capacity?existingResidence.capacity:capacity,
        beds: !beds?existingResidence.beds:beds,
        baths: !baths?existingResidence.baths:baths,
        address: !address?existingResidence.address:address,
        city: !city?existingResidence.city:city,
        municipality: !municipality?existingResidence.municipality:municipality,
        quirtier: !quirtier?existingResidence.quirtier:quirtier,
        aboutResidence: !aboutResidence?existingResidence.aboutResidence:aboutResidence,
        hourlyAmount: !hourlyAmount?existingResidence.hourlyAmount:hourlyAmount,
        dailyAmount: !dailyAmount?existingResidence.dailyAmount:dailyAmount,
        amenities: !amenities?existingResidence.amenities:amenities,
        ownerName: !ownerName?existingResidence.ownerName:ownerName,
        aboutOwner: !aboutOwner?existingResidence.aboutOwner:aboutOwner,
        hostId: req.body.userId,
      };
      if (status) {
        if (existingResidence.status === 'reserved') {
          return res.status(403).json(response({ status: 'Error', statusCode: '403', message: 'You cant change staus while residence is reserved' }));
        }
        else {
          updateResidence.status = status;
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
        updateResidence.photo = files;
      }
      const updatedData = await Residence.findByIdAndUpdate(id, updatedResidence, { new: true });
      return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'residence', message: 'Residence edited successfully.', data: updatedData }));
    } else {
      if (req.files.length > 0) {
        unlinkImages(req.files.map(file => file.path))
      }
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add residence' }));
    }
  }
  catch (error) {
    console.error(error);
    //deleting the images if something went wrong
    if (req.files) {
      unlinkImages(req.files.map(file => file.path))
    }
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error in edited residence' }));
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


module.exports = { addResidence, allResidence, deleteResidence, updateResidence, residenceDetails, residenceDashboard };