const response = require("../helpers/response");
const mongoose = require('mongoose')
const Booking = require("../models/Booking");
const Residence = require("../models/Residence");
const generateCustomID = require('../helpers/generateCustomId');
//a helper function to calculate hours between two date-time
const calculateTotalHoursBetween = require('../helpers/calculateTotalHours')
const User = require("../models/User");
const options = { new: true };

//Add booking
const addBooking = async (req, res) => {
  try {
    const {
      residenceId,
      totalPerson,
      checkInTime,
      checkOutTime,
    } = req.body;

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

    const residence_details = await Residence.findById(residenceId)
    //checking there a booking reques exists in the date
    const existingBookings = await Booking.findOne({
      residenceId: residenceId,
      status: 'reserved',
      $or: [
        {
          $and: [
            { checkInTime: { $lte: checkInTime } },
            { checkOutTime: { $gte: checkInTime } },
          ]
        },
        {
          $and: [
            { checkInTime: { $lte: checkOutTime } },
            { checkOutTime: { $gte: checkOutTime } },
          ]
        }
      ]
    });

    if (existingBookings) {
      return res.status(409).json(response({ status: 'Error', statusCode: '409', message: 'Residence is already booked for the requested time.' }));
    }

    const old_request = await Booking.findOne({
      $and: [
        { residenceId: residenceId },
        { userId: req.body.userId },
        {
          $and: [
            { checkInTime: { $eq: checkInTime } },
            { checkOutTime: { $eq: checkOutTime } }
          ]
        }
      ]
    });

    console.log(old_request)
    if (old_request) {
      return res.status(409).json(response({ status: 'Error', statusCode: '409', message: 'The request already exists, wait for confirmation' }));
    }

    //****
    //checkInTime and checkOutTime format = 2023-09-18T14:30:00
    //****
    //calculating total hours -> amount
    const totalTime = calculateTotalHoursBetween(checkInTime, checkOutTime)
    const amount = totalTime * residence_details.hourlyAmount
    console.log(amount)

    if (checkUser.role === 'user') {
      const booking = new Booking({
        bookingId: await generateCustomID(),
        residenceId,
        totalPerson,
        checkInTime,
        checkOutTime,
        userId: req.body.userId,
        hostId: residence_details.hostId,
        totalAmount: amount,
        userContactNumber: checkUser.phoneNumber,
      });
      await booking.save();
      let popularity = residence_details.popularity
      popularity++
      const residence = {
        popularity
      }
      console.log(popularity, residence)
      await Residence.findByIdAndUpdate(residence_details._id, residence, options)
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'booking', message: 'Booking added successfully.', data: booking }));

    }
    else {
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

    var bookings;
    let count = 0;

    if (checkUser.role === 'admin') {
      var data = {}
      data.status = await bookingDashboardCount()
      //format: 2023-09
      const checkingMonth = !req.query.checkingMonth ? '' : new Date(req.query.checkingMonth)
      var filter
      if (checkingMonth) {
        const year = checkingMonth.getFullYear();
        const month = String(checkingMonth.getMonth() + 1).padStart(2, '0');
        const nextMonth = String(checkingMonth.getMonth() + 2).padStart(2, '0');

        const startDate = `${year}-${month}-01T00:00:00`;
        const endDate = `${year}-${nextMonth}-01T00:00:00`;
        console.log(startDate, endDate)
        filter = {
          checkInTime: {
            $gte: startDate,
            $lte: endDate
          }
        };
      }
      data.bookings = await Booking.find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId hostId residenceId');
      count = await Booking.countDocuments(filter);

      bookings = data
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

    console.log(bookings)
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
    const checkUser = await User.findById(req.body.userId);
    //extracting the booking id from param that is going to be edited
    const id = req.params.id
    const { status } = req.body;
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkUser.role === 'host') {
      const booking = { status }

      //changing residence status to reserved
      //----->start
      const booking_details = await Booking.findById(id)
      if (status === 'reserved') {
        const updated_residence = {
          status
        }
        await Residence.findByIdAndUpdate(booking_details.residenceId, updated_residence, options);
      }
      else {
        const updated_residence = {
          status: 'active'
        }
        await Residence.findByIdAndUpdate(booking_details.residenceId, updated_residence, options);
      }
      //----->end

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
};

//booking details
const bookingDetails = async (req, res) => {
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

    const id = req.params.id

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

async function bookingDashboardCount() {
  try {
    const completed = await Booking.countDocuments({ status: 'completed' });
    const cancelled = await Booking.countDocuments({ status: 'cancelled' });
    const reserved = await Booking.countDocuments({ status: 'reserved' });
    const count_data = {
      completed,
      cancelled,
      reserved
    };
    return count_data;
  }
  catch (error) {
    console.log(error)
  }
}
const bookingDashboardRatio = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    const year = !req.query.year ? new Date() : new Date(req.query.year)
    const conditionalYear = year.getFullYear()
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };

    if (checkUser.role === 'admin') {
      const status = await bookingDashboardCount();
      const bookings = await Booking.find({ status: 'completed' });

      // Initialize an array to hold objects for each month
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];

      const monthlyCounts = monthNames.map((month) => ({ month: month, bookingCounts: 0 }));

      bookings.forEach(booking => {
        const updatedAt = new Date(booking.updatedAt);
        const month = updatedAt.getMonth(); // Month is 0-indexed and will get 0-11
        const gettingYear = updatedAt.getFullYear();
        console.log('month ------------------------------>', month, booking)
        // Check if the booking is in the specified year
        if (conditionalYear === gettingYear) {
          monthlyCounts[month].bookingCounts += 1;
        }
      });

      const data = {
        status,
        monthlyCounts
      };

      return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'booking', message: 'Booking ratio is successfully retrieved', data: data }));
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to get monthly ratio' }));
    }
  }
  catch (error) {
    console.log(error)
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Server not responding' }));
  }
}



module.exports = { addBooking, allBooking, updateBooking, bookingDetails, bookingDashboardCount, bookingDashboardRatio };