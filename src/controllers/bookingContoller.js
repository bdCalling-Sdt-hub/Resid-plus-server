const response = require("../helpers/response");
const Booking = require("../models/Booking");
const Residence = require("../models/Residence");
const Payment = require("../models/Payment");
const generateCustomID = require('../helpers/generateCustomId');
//a helper function to calculate hours between two date-time
const calculateTotalHoursBetween = require('../helpers/calculateTotalHours')
const User = require("../models/User");
const { addNotification, addManyNotifications, getAllNotification } = require("./notificationController");
const options = { new: true };
const kkiapay = require('kkiapay-nodejs-sdk')
const k = kkiapay({
  privatekey: process.env.KKIAPAY_PRKEY,
  publickey: process.env.KKIAPAY_PBKEY,
  secretkey: process.env.KKIAPAY_SCKEY,
  sandbox: true
})


const calculateTimeAndPrice = async (req, res) => {
  try {
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
    let {
      checkInTime,
      checkOutTime,
      residenceId
    } = req.body;
    const residence_details = await Residence.findById(residenceId);
    if (!residence_details) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'Residence not found',
        })
      );
    }

    checkInTime = new Date(checkInTime)
    checkOutTime = new Date(checkOutTime)

    if (checkInTime > checkOutTime) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'Check-in time must be greater than check-out time',
        })
      );
    }

    const hourlyAmount = residence_details.hourlyAmount / 5 //as we are charging for 5 hours minimum
    const totalHours = calculateTotalHoursBetween(checkInTime, checkOutTime)
    if (totalHours < 5) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'Total stay must be greater than 5 hours',
        })
      );
    }

    const initialAmount = totalHours * hourlyAmount
    //charging 6%, 3% for admin and 3% for payout charge
    const totalAmount = Math.ceil(initialAmount + (0.06 * initialAmount))

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'booking',
        message: 'Booking Time retrieved successfully',
        data: {
          checkInTime,
          checkOutTime,
          totalHours,
          totalAmount
        },
      })
    );
  }
  catch (error) {
    console.log(error)
  }
}
//Add booking
const addBooking = async (req, res) => {
  try {
    let {
      residenceId,
      checkInTime,
      checkOutTime,
      totalHours,
      totalAmount,
      guestTypes,
      numberOfGuests
    } = req.body;

    if (!numberOfGuests || !guestTypes || !checkInTime || !checkOutTime || !totalHours || !totalAmount || !residenceId) {
      console.log('Booking requst validation----------->', req.body)
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '403',
          message: 'Please fill all the fields',
        })
      );
    }

    checkInTime = new Date(checkInTime)
    checkOutTime = new Date(checkOutTime)
    console.log('add booking called ------------------->', req.body)

    if (checkInTime > checkOutTime) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'Check-in time must be grater than check-out time',
        })
      );
    }

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

    const residence_details = await Residence.findById(residenceId).populate(`hostId`);
    if (!residence_details || residence_details.isDeleted) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Residence not found' }));
    }
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

    if (checkUser.role === 'user') {
      const booking = new Booking({
        bookingId: await generateCustomID(),
        residenceId,
        checkInTime,
        checkOutTime,
        userId: req.body.userId,
        hostId: residence_details.hostId,
        totalHours,
        totalAmount,
        userContactNumber: checkUser.phoneNumber,
        guestTypes,
        numberOfGuests
      });
      await booking.save();
      let popularity = residence_details.popularity
      popularity++
      const residence = {
        popularity
      }
      console.log(popularity, residence)
      await Residence.findByIdAndUpdate(residence_details._id, residence, options)

      const message = checkUser.fullName + ' wants to book ' + booking.residenceId.residenceName + ' from ' + booking.checkInTime + ' to ' + booking.checkOutTime
      const newNotification = {
        message: message,
        receiverId: booking.hostId,
        image: checkUser.image,
        linkId: booking._id,
        type: 'booking',
        role: 'host'
      }
      await addNotification(newNotification)
      const notification = await getAllNotification('host', 30, 1, booking.hostId)
      io.to('room' + booking.hostId).emit('host-notification', notification);

      console.log('add booking successfull --------->', booking)
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
      data.bookings = await Booking.find({ isDeleted: false, ...filter })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId hostId residenceId');
      count = await Booking.countDocuments({ isDeleted: false, ...filter });

      bookings = data
    }
    else if (checkUser.role === 'host') {
      var filter
      const bookingTypes = !req.query.bookingTypes ? '' : req.query.bookingTypes

      if (bookingTypes === "confirmed") {
        filter = {
          status: { $nin: ['pending', 'check-out', 'cancelled'] },
        }
      }
      else if (bookingTypes === "history") {
        filter = {
          $and: [
            { status: { $eq: 'check-out' } },
            { isHostHistoryDeleted: { $eq: false } }
          ]
        }
      }
      else {
        filter = {
          status: { $eq: 'pending' },
        }
      }

      bookings = await Booking.find({
        hostId: checkUser._id,
        isDeleted: false,
        ...filter
      })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId hostId residenceId')
        .sort({ createdAt: -1 });
      count = await Booking.countDocuments({
        hostId: checkUser._id,
        isDeleted: false,
        ...filter
      });
      console.log('---------------->', bookingTypes, filter, bookings, count)
    }
    else if (checkUser.role === 'user') {
      const bookingTypes = !req.query.bookingTypes ? '' : req.query.bookingTypes
      var filter
      if (bookingTypes === "history") {
        filter = {
          $and: [
            { status: { $eq: 'check-out' } },
            { isUserHistoryDeleted: { $eq: false } }
          ]
        }
      }
      else {
        filter = {
          $and: [
            { status: { $ne: 'check-out' } },
            { isUserHistoryDeleted: { $eq: false } }
          ]
        }
      }

      bookings = await Booking.find({
        userId: checkUser._id,
        isDeleted: false,
        ...filter
      })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId hostId residenceId')
        .sort({ createdAt: -1 });
      count = await Booking.countDocuments({
        userId: checkUser._id,
        isDeleted: false,
        ...filter
      });
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
    if (!status) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '403',
          message: 'Please fill all the fields',
        })
      );
    }
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    const bookingDetails = await Booking.findById(id).populate('residenceId userId hostId')
    if (!bookingDetails || bookingDetails.isDeleted) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'booking', message: 'Booking not found' }));
    }
    if (checkUser.role === 'host') {
      if (bookingDetails.hostId._id.toString() !== checkUser._id.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'booking', message: 'This is not your residence' }));
      }
      if (status === 'reserved') {
        if (bookingDetails.status === 'pending') {
          const updated_residence = {
            status
          }
          await Residence.findByIdAndUpdate(bookingDetails.residenceId, updated_residence, options);

          bookingDetails.status = status
          bookingDetails.save()

          const adminMessage = bookingDetails.userId.fullName + ' booked ' + bookingDetails.residenceId.residenceName
          const userMessage = bookingDetails.hostId.fullName + ' accepted your booking request for ' + bookingDetails.residenceId.residenceName + ', so make payment to confirm your booking'

          const newNotification = [{
            message: adminMessage,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            role: 'admin',
            type: 'booking'
          }, {
            message: userMessage,
            receiverId: bookingDetails.userId._id,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            role: 'user',
            type: 'booking'
          }]
          await addManyNotifications(newNotification)
          const adminNotification = await getAllNotification('admin')
          io.emit('admin-notification', adminNotification);
          const userNotification = await getAllNotification('user', 6, 1, bookingDetails.userId._id)
          console.log(adminNotification, userNotification)
          io.to('room' + bookingDetails.userId._id).emit('user-notification', userNotification);

          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: bookingDetails }));
        }
        else {
          return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'booking', message: 'Your booking-request update credentials not match' }));
        }
      }
      else if (status === 'cancelled') {
        if (bookingDetails.status === 'pending') {
          //changing payment status to rejected
          // const payment = await Payment.findOne({ bookingId: bookingDetails._id })
          // payment.status = 'rejected'
          // payment.save()

          bookingDetails.status = status
          bookingDetails.save()
          const userMessage = bookingDetails.hostId.fullName + ' cancelled your booking request for ' + bookingDetails.residenceId.residenceName

          const newNotification = {
            message: userMessage,
            receiverId: bookingDetails.userId._id,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            role: 'user',
            type: 'booking'
          }
          await addNotification(newNotification)
          const userNotification = await getAllNotification('user', 6, 1, bookingDetails.userId._id)
          console.log(userNotification)
          io.to('room' + bookingDetails.userId._id).emit('user-notification', userNotification);

          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: bookingDetails }));
        }
        else {
          return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'booking', message: 'Your booking-request update credentials not match' }));
        }
      }
      else {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: "booking-request", message: 'Your booking-request update credentials not match' }));
      }
      //----->end
    }
    else if (checkUser.role === 'user') {
      if (bookingDetails.userId._id.toString() !== checkUser._id.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'booking', message: 'You are not authorised to access this booking request' }));
      }
      if (status === 'check-in') {
        if (bookingDetails.paymentTypes !== 'unknown' && bookingDetails.status === 'reserved') {
          bookingDetails.status = status
          bookingDetails.save()
          const hostMessage = bookingDetails.userId.fullName + ' checked-in to ' + bookingDetails.residenceId.residenceName + ', please do the payment'

          const newNotification = {
            message: hostMessage,
            receiverId: bookingDetails.hostId._id,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            role: 'host',
            type: 'booking'
          }
          await addNotification(newNotification)
          const hostNotification = await getAllNotification('host', 6, 1, bookingDetails.hostId._id)
          console.log(hostNotification)
          io.to('room' + bookingDetails.hostId._id).emit('host-notification', hostNotification);

          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: bookingDetails }));
        }
        else {
          return res.status(409).json(response({ status: 'Error', statusCode: '409', type: "booking-request", message: 'Your booking-request update credentials not match' }));
        }
      }
      else if (status === "check-out") {
        if (bookingDetails.paymentTypes === 'full-payment' && bookingDetails.status === 'check-in') {
          bookingDetails.status = status
          bookingDetails.save()

          const residence = await Residence.findById(bookingDetails.residenceId)
          residence.status = 'active'
          await residence.save()

          const hostMessage = bookingDetails.userId.fullName + ' checked-out from ' + bookingDetails.residenceId.residenceName + ', and payment is transferred to your account'
          const newNotification = {
            message: hostMessage,
            receiverId: bookingDetails.hostId._id,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            type: 'booking',
            role: 'host'
          }
          await addNotification(newNotification)
          const hostNotification = await getAllNotification('host', 6, 1, bookingDetails.hostId._id)
          console.log(hostNotification)
          io.to('room' + bookingDetails.hostId._id).emit('host-notification', hostNotification);
          const sendingAmount = Math.ceil(0.96 * bookingDetails.totalAmount)
          k.setup_payout({
            algorithm: "roof",
            send_notification: true,
            destination_type: "MOBILE_MONEY",
            roof_amount: sendingAmount,
            destination: bookingDetails.hostId.phoneNumber
          }).then(async (response) => {
            const hostMessage = bookingDetails.userId.fullName + ' checked-out from ' + bookingDetails.residenceId.residenceName + ', payment is transferred to your KKiapay account no-' + bookingDetails.hostId.phoneNumber
            const adminMessage = bookingDetails.userId.fullName + ' checked-out from ' + bookingDetails.residenceId.residenceName + ', payment is transferred to host KKiapay account no-' + bookingDetails.hostId.phoneNumber
            const newNotification = [{
              message: hostMessage,
              receiverId: bookingDetails.hostId._id,
              image: bookingDetails.userId.image,
              linkId: bookingDetails._id,
              type: 'booking',
              role: 'host'
            }, {
              message: adminMessage,
              image: bookingDetails.userId.image,
              linkId: bookingDetails._id,
              type: 'booking',
              role: 'host'
            }]
            await Notification.add
            const adminNotification = await getAllNotification('admin')
            io.emit('admin-notification', adminNotification);
            const userNotification = await getAllNotification('user', 6, 1, bookingDetails.userId._id)
            console.log(adminNotification, userNotification)
            io.to('room' + bookingDetails.userId._id).emit('user-notification', userNotification);
            res.status(200).json(response)
          }).catch((error) => {
            const hostMessage = bookingDetails.userId.fullName + ' checked-out from ' + bookingDetails.residenceId.residenceName + ', '
            const newNotification = {
              message: hostMessage,
              receiverId: bookingDetails.hostId._id,
              image: bookingDetails.userId.image,
              linkId: bookingDetails._id,
              type: 'booking',
              role: 'host'
            }
            res.status(500).json(error)
          })
          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: bookingDetails }));
        }
        else {
          return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'booking', message: 'Your booking-request update credentials not match' }));
        }
      }
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to edit booking' }));
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
      booking = await Booking.findById(id).populate('hostId userId').exec();
    }
    else if (checkUser.role === 'host' || checkUser.role === 'user') {
      booking = await Booking.findById(id).populate('hostId userId residenceId').exec();
    }
    if (!booking.isDeleted) {
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
    }
    else {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'Booking not found',
          type: 'booking',
        })
      );
    }
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
    const completed = await Booking.countDocuments({ status: 'completed', isDeleted: false });
    const cancelled = await Booking.countDocuments({ status: 'cancelled', isDeleted: false });
    const reserved = await Booking.countDocuments({ status: 'reserved', isDeleted: false });
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

const deleteBooking = async (req, res) => {
  try {
    const checkHost = await User.findById(req.body.userId);
    //extracting the booking id from param that is going to be deleted
    const id = req.params.id
    if (!id) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '403',
          message: 'Please fill all the fields',
        })
      );
    }
    if (!checkHost) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkHost.role === 'user') {
      const bookingDetails = await Booking.findOne({ _id: id })
      if (!bookingDetails) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking not found' }));
      }
      console.log(bookingDetails.userId.toString(), req.body.userId.toString())
      if (bookingDetails.userId.toString() !== req.body.userId.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to delete this booking' }));
      }
      if (!bookingDetails.isDeleted && bookingDetails.status === 'pending') {
        await Booking.findByIdAndDelete(id)
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'booking', message: 'Booking deleted successfully.', data: bookingDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "booking", message: 'Delete credentials not match' }));
      }
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add booking' }));
    }
  }
  catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error deleted booking' }));
  }
}

const deleteHistory = async (req, res) => {
  try {
    const checkHost = await User.findById(req.body.userId);
    //extracting the booking id from param that is going to be deleted
    const id = req.params.id
    if (!id) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '403',
          message: 'Please fill all the fields',
        })
      );
    }
    if (!checkHost) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkHost.role === 'user') {
      const bookingDetails = await Booking.findOne({ _id: id })
      if (!bookingDetails) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking not found' }));
      }
      //console.log(bookingDetails.userId.toString(), req.body.userId.toString())
      if (bookingDetails.userId.toString() !== req.body.userId.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to delete this booking' }));
      }
      if (!bookingDetails.isDeleted && !bookingDetails.isUserHistoryDeleted && bookingDetails.status === 'check-out') {
        bookingDetails.isUserHistoryDeleted = true
        await bookingDetails.save()
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'booking', message: 'Booking deleted successfully.', data: bookingDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "booking", message: 'Delete credentials not match' }));
      }
    }
    else if (checkHost.role === 'host') {
      const bookingDetails = await Booking.findOne({ _id: id })
      if (!bookingDetails) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking not found' }));
      }
      //console.log(bookingDetails.userId.toString(), req.body.userId.toString())
      if (bookingDetails.hostId.toString() !== req.body.userId.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to delete this booking' }));
      }
      if (!bookingDetails.isDeleted && !bookingDetails.isHostHistoryDeleted && bookingDetails.status === 'check-out') {
        bookingDetails.isHostHistoryDeleted = true
        await bookingDetails.save()
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'booking', message: 'Booking deleted successfully.', data: bookingDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "booking", message: 'Delete credentials not match' }));
      }
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add booking' }));
    }
  }
  catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error deleted booking' }));
  }
}

module.exports = { addBooking, allBooking, updateBooking, bookingDetails, bookingDashboardCount, bookingDashboardRatio, deleteBooking, calculateTimeAndPrice, deleteHistory };