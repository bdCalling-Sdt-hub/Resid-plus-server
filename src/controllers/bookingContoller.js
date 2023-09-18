const response = require("../helpers/response");
const mongoose = require('mongoose')
const Booking = require("../models/Booking");
const Residence = require("../models/Residence");
//a helper function to calculate hours between two date-time
const calculateTotalHoursBetween = require('../helpers/calculateTotalHours')
const User = require("../models/User");

//Add booking
const addBooking = async (req, res) => {
  try {
    const {
      residenceId,
      totalPerson,
      checkInTime,
      checkOutTime,
    } = req.body;

    const checkHost = await User.findById(req.body.userId);
    const residence_details = await Residence.findById(residenceId)
    //****
    //checkInTime and checkOutTime format = 2023-09-18T14:30:00
    //****
    //calculating total hours -> amount
    const amount = calculateTotalHoursBetween(checkInTime, checkOutTime) * residence_details.hourlyAmount
    if (!checkHost) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };

    if (checkHost.role === 'user') {
      const booking = new Booking({
        residenceId,
        totalPerson,
        checkInTime,
        checkOutTime,
        userId: req.body.userId,
        hostId: residence_details.hostId,
        totalAmount: amount,
        userContactNumber: checkHost.phoneNumber,
      });

      await booking.save();

      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'booking', message: 'Booking added successfully.', data: booking }));
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add booking' }));
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error added booking' }));
  }
};

//All bookings
const allBooking = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    //particular id
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = today.getDate();

    const formattedDate = `${year}-` + `${month}-` + `${day}`;
    const checkInDate = req.query.checkInDate || formattedDate;

    const startDate = `${checkInDate}T00:00:00`;
    const endDate = `${checkInDate}T23:59:59`;
    console.log(startDate, endDate)
    const filter = {
      checkInTime: {
        $gte: startDate,
        $lte: endDate
      }
    };
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    //confused in applying filter

    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }

    let bookings = [];
    let count = 0;

    if (checkUser.role === 'admin') {
      bookings = await Booking.find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId');
      count = await Booking.countDocuments(filter);
    }
    else if (checkUser.role === 'host') {
      bookings = await Booking.find({
        hostId: checkUser._id
      })
        .limit(limit)
        .skip((page - 1) * limit);
      count = await Booking.countDocuments();
    }
    else if (checkUser.role === 'user') {
      bookings = await Booking.find({
        userId: checkUser._id
      })
        .limit(limit)
        .skip((page - 1) * limit);
      count = await Booking.countDocuments();
    }

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'booking',
        message: 'Bookings retrieved successfully',
        data: {
          bookings,
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
        message: 'Error getting bookings',
      })
    );
  }
};

//update bookings
const updateBooking = async (req, res) => {
  console.log(req.body)
  try {
    const checkHost = await User.findById(req.body.userId);
    //extracting the booking id from param that is going to be edited
    const id = req.params.id
    const { status } = req.body;
    if (!checkHost) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkHost.role === 'host') {
      const booking = { status }
      const options = { new: true };
      const result = await Booking.findByIdAndUpdate(id, booking, options);
      console.log(result)
      return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: result }));
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add booking' }));
    }
  }
  catch (error) {
    console.error(error);
    //deleting the images if something went wrong

    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error added booking' }));
  }
}

//booking details
const bookingDetails = async (req, res) => {
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

    var booking
    if (checkUser.role === 'admin') {
      booking = await Booking.findById(id).populate('hostId').exec();
    }
    else if (checkUser.role === 'host' || checkUser.role === 'user') {
      booking = await Booking.findById(id);
    }
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'booking',
        message: 'Booking retrieved successfully',
        data: {
          booking
        },
      })
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: 'Error getting bookings',
      })
    );
  }
};


module.exports = { addBooking, allBooking, updateBooking, bookingDetails };