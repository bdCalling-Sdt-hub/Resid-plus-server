const response = require("../helpers/response");
const Residence = require("../models/Residence");
const Booking = require('../models/Booking')
const User = require("../models/User");
const mongoose = require('mongoose');
//defining unlinking image function 
const unlinkImages = require('../common/image/unlinkImage');
const { addNotification, getAllNotification } = require("./notificationController");
const logger = require("../helpers/logger");
const Category = require("../models/Category");

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

    if (!checkHost || checkHost.status !== 'accepted') {
      //deleting the images if user is not valid
      unlinkImages(req.files.map(file => file.path))
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
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

      const existingResidence = await Residence.findOne({ residenceName: residenceName, hostId: req.body.userId, capacity: capacity, beds: beds, baths: baths, address: address, city: city, municipality: municipality, quirtier: quirtier, aboutResidence: aboutResidence, hourlyAmount: hourlyAmount, dailyAmount: dailyAmount, amenities: amenities, ownerName: ownerName, aboutOwner: aboutOwner, category: category });
      if (existingResidence && !existingResidence.isDeleted) {
        //deleting the images if residence already exists
        unlinkImages(req.files.map(file => file.path))
        return res.status(409).json(response({ status: 'Error', statusCode: '409', message: req.t('Residence already exists') }));
      }
      else if (existingResidence && existingResidence.isDeleted) {
        //deleting the images if residence already exists
        const paths = existingResidence.photo.map(photoObject => photoObject.path).flat();
        unlinkImages(paths)
        existingResidence.photo = files;
        existingResidence.isDeleted = false;
        existingResidence.save();
        return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'residence', message: req.t('Residence added successfully.'), data: existingResidence }));
      }

      await residence.save();
      const message = checkHost.fullName + ' has added ' + residence.residenceName + ', please check and give your feedback'
      const newNotification = {
        message: message,
        image: checkHost.image,
        linkId: residence._id,
        type: 'residence',
        role: 'admin'
      }
      await addNotification(newNotification)
      const notification = await getAllNotification('super-admin', 10, 1)
      io.emit('super-admin-notification', notification);

      const commonNotif = await getAllNotification('admin', 10, 1)
      io.emit('admin-notification', commonNotif);

      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'residence', message: req.t('Residence added successfully.'), data: residence }));
    } else {
      //deleting the images if user is host
      unlinkImages(req.files.map(file => file.path))
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are Not authorize to add residence') }));
    }

  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    //deleting the images if something went wrong
    unlinkImages(req.files.map(file => file.path))
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
  }
};

//All residences
const allResidence = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);

    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }
    const search = req.query.search || '';
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const category = req.query.category || ''
    const numberOfBeds = Number(req.query.numberOfBeds) || ''
    const acceptanceStatus = req.query.acceptanceStatus || 'accepted'
    const reUploaded = req.query.reUpload || 'no'

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

    if (acceptanceStatus && acceptanceStatus !== 'all') {
      console.log('Acceptance Status------>', acceptanceStatus)
      filter.$and = filter.$and || [];
      filter.$and.push({ acceptanceStatus: acceptanceStatus });
    }

    if (reUploaded === 'yes') {
      filter.$and = filter.$and || [];
      filter.$and.push({ reUpload: true });
    }

    let residences = [];
    let count = 0;

    if (checkUser.role === 'user') {
      const requestType = req.query.requestType || 'all'
      if (requestType === 'all') {
        residences = await Residence.find({ isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .populate('amenities', 'translation')
          .populate('category', 'translation');

        count = await Residence.countDocuments({ status: 'active', isDeleted: false, ...filter });
      }
      else if (requestType === 'new') {
        residences = await Residence.find({ status: 'active', isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ createdAt: -1 })
          .populate('amenities', 'translation')
          .populate('category', 'translation');
        count = await Residence.countDocuments({ status: 'active', isDeleted: false, ...filter });
      }
      else if (requestType === 'popular') {
        residences = await Residence.find({ status: 'active', isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ popularity: -1 })
          .populate('amenities', 'translation')
          .populate('category', 'translation');;
        count = await Residence.countDocuments({ status: 'active', isDeleted: false, ...filter });
      }
    }
    else if (checkUser.role === 'host') {
      const requestType = req.query.requestType || 'all'
      if (requestType === 'all') {
        residences = await Residence.find({ hostId: checkUser._id, isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .populate('amenities', 'translation')
          .populate('category', 'translation');
        count = await Residence.countDocuments({ hostId: checkUser._id, isDeleted: false, ...filter });
      }
      else if (requestType === 'new') {
        residences = await Residence.find({ hostId: checkUser._id, isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ createdAt: -1 })
          .populate('amenities', 'translation')
          .populate('category', 'translation');
        count = await Residence.countDocuments({ hostId: checkUser._id, isDeleted: false, ...filter });
      }
      else if (requestType === 'popular') {
        residences = await Residence.find({ hostId: checkUser._id, isDeleted: false, ...filter })
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({ popularity: -1 })
          .populate('amenities', 'translation')
          .populate('category', 'translation');
        count = await Residence.countDocuments({ hostId: checkUser._id, isDeleted: false, ...filter });
      }
    }
    //-> placed to residence dashboard API
    else if (checkUser.role === 'admin') {
      const data = await Residence.find({ ...filter })
        .limit(limit)
        .skip((page - 1) * limit)
        .select('photo residenceName acceptanceStatus')
      count = await Residence.countDocuments({ ...filter });
      const accepted = await Residence.countDocuments({ acceptanceStatus: 'accepted' });
      const pending = await Residence.countDocuments({ acceptanceStatus: 'pending' });
      const blocked = await Residence.countDocuments({ acceptanceStatus: 'blocked' });
      residences = {
        data,
        count: {
          accepted,
          pending,
          blocked
        }
      }
    }

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'residence',
        message: req.t('Residences retrieved successfully'),
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
    logger.error(error, req.originalUrl)
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting residences'),
      })
    );
  }
};

const searchCredentials = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }
    if (checkUser.role === 'user') {
      const noOfUniqueBeds = await Residence.distinct('beds');
      const minPriceResidence = await Residence.find().sort({ dailyAmount: 1 }).populate('dailyAmount').limit(1);
      const maxPriceResidence = await Residence.find().sort({ dailyAmount: -1 }).populate('dailyAmount').limit(1);
      const minPrice = minPriceResidence[0].dailyAmount;
      const maxPrice = maxPriceResidence[0].dailyAmount;
      const range = maxPrice - minPrice;
      const priceRange = Math.ceil(range / 5);
      let priceArray = [];

      if (priceRange === 0) {
        priceArray = [{ min: minPrice, max: maxPrice }];
      } else {
        for (let i = 0; i < 5; i++) {
          const minRange = minPrice + priceRange * i;
          const maxRange = minRange + priceRange;
          priceArray.push({ min: minRange, max: maxRange });
        }
      }

      console.log('all data --------->', noOfUniqueBeds, minPrice, maxPrice, priceRange, range)
      const data = {
        noOfUniqueBeds,
        priceArray,
      }
      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '200',
          type: 'residence',
          message: req.t('Search credentials retrieved successfully'),
          data: data,
        })
      );
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to get all search credentials') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error)
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Internal Server Error'),
      })
    );
  }
}

//Delete residences
const deleteResidence = async (req, res) => {
  try {
    const checkHost = await User.findById(req.body.userId);
    //extracting the residence id from param that is going to be deleted
    const id = req.params.id
    if (!checkHost || checkHost.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (checkHost.role === 'host') {
      const residenceDetails = await Residence.findOne({ _id: id })
      if (!residenceDetails) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Residence not found') }));
      }
      if (residenceDetails.hostId._id.toString() !== req.body.userId.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to delete this residence') }));
      }
      if (residenceDetails.status === 'reserved') {
        return res.status(403).json(response({ status: 'Error', statusCode: '403', message: req.t('You cant delete residence while it is reserved') }));
      }
      if (!residenceDetails.isDeleted && residenceDetails.status !== 'reserved') {
        const today = new Date();
        const futureBookings = await Booking.findOne({
          residenceId: id,
          startDate: { $gte: today },
          status: { $ne: 'pending' }
        });

        if (futureBookings) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', type: 'residence', message: req.t('Cannot delete residence with future booking requests accepted.') }));
        }
        //console.log('images to be deleted-------------->',residenceDetails.photo)
        const paths = residenceDetails.photo.map(photoObject => photoObject.path).flat();
        unlinkImages(paths)
        residenceDetails.isDeleted = true;
        residenceDetails.save();
        await Booking.updateMany({ residenceId: id }, { $set: { isDeleted: true } });
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'residence', message: req.t('Residence deleted successfully.'), data: residenceDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "residence", message: req.t('Delete credentials not match') }));
      }
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are Not authorize to delete residence') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Error deleted residence') }));
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
      status,
      category
    } = req.body;

    if (!checkHost || checkHost.status !== 'accepted') {
      if (req.files.length > 0) {
        unlinkImages(req.files.map(file => file.path))
      }
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (category) {
      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Category not found') }));
      }
    }

    const existingResidence = await Residence.findById(id);
    if (checkHost.role === 'host' && checkHost._id.toString() === existingResidence.hostId.toString()) {
      const updateType = req.query.updateType || 'general'
      const updatedResidence = {
        residenceName: !residenceName ? existingResidence.residenceName : residenceName,
        capacity: !capacity ? existingResidence.capacity : capacity,
        beds: !beds ? existingResidence.beds : beds,
        baths: !baths ? existingResidence.baths : baths,
        address: !address ? existingResidence.address : address,
        city: !city ? existingResidence.city : city,
        municipality: !municipality ? existingResidence.municipality : municipality,
        quirtier: !quirtier ? existingResidence.quirtier : quirtier,
        aboutResidence: !aboutResidence ? existingResidence.aboutResidence : aboutResidence,
        hourlyAmount: !hourlyAmount ? existingResidence.hourlyAmount : hourlyAmount,
        dailyAmount: !dailyAmount ? existingResidence.dailyAmount : dailyAmount,
        amenities: !amenities ? existingResidence.amenities : amenities,
        ownerName: !ownerName ? existingResidence.ownerName : ownerName,
        aboutOwner: !aboutOwner ? existingResidence.aboutOwner : aboutOwner,
        category: !category ? existingResidence.category : category,
        hostId: req.body.userId,
      };
      if (status) {
        if (status !== 'active' || status !== 'inactive') {
          return res.status(403).json(response({ status: 'Error', statusCode: '403', message: req.t('Invalid status') }));
        }
        else {
          updatedResidence.status = status;
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
        updatedResidence.photo = files;
      }
      if (updateType === 'admin-suggessions') {
        updatedResidence.reUpload = true;
      }
      const updatedData = await Residence.findByIdAndUpdate(id, updatedResidence, { new: true });

      if (updateType === 'admin-suggessions') {
        const message = checkHost.fullName + ' has updated ' + existingResidence.residenceName + ' . Your feedBack was: ' + existingResidence.feedBack

        const newNotification = {
          message: message,
          image: checkHost.image,
          linkId: existingResidence._id,
          type: 'residence',
          role: 'host'
        }
        await addNotification(newNotification)
        const notification = await getAllNotification('super-admin', 10, 1)
        io.emit('super-admin-notification', notification);

        const commonNotif = await getAllNotification('admin', 10, 1)
        io.emit('super-admin-notification', commonNotif);
      }
      return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'residence', message: req.t('Residence edited successfully.'), data: updatedData }));
    }
    else if (checkHost.role === 'admin' || checkHost.role === 'super-admin') {
      const { acceptanceStatus } = req.body
      if (!acceptanceStatus) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Acceptance status must be given' }));
      }
      if (acceptanceStatus === 'accepted') {
        if (existingResidence.acceptanceStatus !== 'deleted') {
          const message = checkHost.fullName + ' has accepted ' + existingResidence.residenceName + ' from being ' + existingResidence.acceptanceStatus

          existingResidence.acceptanceStatus = acceptanceStatus;
          existingResidence.reUpload = false;
          existingResidence.feedBack = null;
          existingResidence.save();

          const newNotification = {
            receiverId: existingResidence.hostId,
            message: message,
            image: checkHost.image,
            linkId: existingResidence._id,
            type: 'residence',
            role: 'host'
          }
          const notification = await addNotification(newNotification)
          io.to('room' + existingResidence.hostId).emit('host-notification', notification);

        }
        else {
          return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Residence accepting requirements not fulfilled' }));
        }
      }
      else {
        const bookingStatus = await Booking.findOne({ residenceId: existingResidence._id, isDeleted: false, status: { $nin: ['pending', 'cancelled'] } })
        if (bookingStatus) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: `Cannot reject or delete residence with when it is booked, please try this on ${bookingStatus.checkOutTime}` }));
        }
        if (acceptanceStatus === 'blocked') {
          if (existingResidence.acceptanceStatus !== 'deleted') {
            const { feedBack } = req.body
            if (!feedBack) {
              return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Feedback must be given' }));
            }
            const message = 'Admin has blocked ' + existingResidence.residenceName + ' from being ' + existingResidence.acceptanceStatus + ' . Reason: ' + feedBack

            existingResidence.feedBack = feedBack;
            existingResidence.reUpload = false;
            existingResidence.acceptanceStatus = acceptanceStatus;
            existingResidence.save();

            const newNotification = {
              receiverId: existingResidence.hostId,
              message: message,
              image: checkHost.image,
              linkId: existingResidence._id,
              type: 'residence',
              role: 'host'
            }
            const notification = await addNotification(newNotification)
            io.to('roon' + existingResidence.hostId).emit('host-notification', notification);
          }
          else {
            return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Residence rejection requirements not fulfilled' }));
          }
        }
        else if (acceptanceStatus === 'deleted') {
          if (existingResidence.acceptanceStatus !== 'deleted') {
            const message = checkHost.fullName + ' has deleted ' + existingResidence.residenceName + ' from being ' + existingResidence.acceptanceStatus

            existingResidence.acceptanceStatus = acceptanceStatus;
            existingResidence.save();

            const newNotification = {
              message: message,
              image: checkHost.image,
              linkId: existingResidence._id,
              type: 'residence',
              role: 'host'
            }
            const notification = await addNotification(newNotification)
            io.to('roon' + existingResidence.hostId).emit('host-notification', notification);

          }
          else {
            return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Residence deletion requirements not fulfilled' }));
          }
        }
        else {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Acceptance status not defined' }));
        }
      }
      return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'residence', message: 'Residence edited successfully.', data: existingResidence }));
    }

    else {
      if (req.files.length > 0) {
        unlinkImages(req.files.map(file => file.path))
      }
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are Not authorize to add residence') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    //deleting the images if something went wrong
    if (req.files) {
      unlinkImages(req.files.map(file => file.path))
    }
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
  }
}

//residences details
const residenceDetails = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    const id = req.params.id
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const residences = await Residence.findById(id).populate('amenities', 'translation').populate('category', 'translation').populate('hostId', 'fullName image phoneNumber email address');

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'residence',
        message: req.t('Residence retrieved successfully'),
        data: {
          residences
        },
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting residences'),
      })
    );
  }
};

const residenceDashboard = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };

    if (checkUser.role === 'super-admin' || checkUser.role === 'admin') {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const residences = await Residence.find()
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('amenities', 'translation')
        .populate('category', 'translation');
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
          message: req.t('Residence count and details retrieved successfully'),
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to get all counts') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error)
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Server not responding') }));
  }
}

module.exports = { addResidence, allResidence, deleteResidence, updateResidence, residenceDetails, residenceDashboard, searchCredentials };