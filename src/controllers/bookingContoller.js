const response = require("../helpers/response");
require('dotenv').config()
const Booking = require("../models/Booking");
const Residence = require("../models/Residence");
const Payment = require("../models/Payment");
const Income = require("../models/Income")
const generateCustomID = require('../helpers/generateCustomId');
//a helper function to calculate hours between two date-time
const calculateTotalHoursBetween = require('../helpers/calculateTotalHours')
const User = require("../models/User");
const { addNotification, addManyNotifications, getAllNotification } = require("./notificationController");
const options = { new: true };
const logger = require("../helpers/logger");
const axios = require('axios');
const sendSMS = require("../helpers/sendMessage");
require('dotenv').config()

const calculateTimeAndPrice = async (req, res) => {
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
    let {
      checkInTime,
      checkOutTime,
      residenceId,
      requestBy
    } = req.body;

    const residence_details = await Residence.findById(residenceId).populate('category');
    if (!residence_details) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Residence not found'),
        })
      );
    }

    if(checkInTime){
      checkInTime = new Date(checkInTime)
    }

    if (checkInTime && requestBy === 'half-day' && residence_details.category.key !== 'hotel') {
      checkOutTime = new Date(checkInTime.getTime() + 12 * 60 * 60 * 1000)
    }

    console.log('-------->', req.body)
    if (!checkInTime || !checkOutTime || !residenceId || !requestBy) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Please fill all the fields'),
        })
      );
    }

    const today = new Date()

    if (checkInTime < today) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Check-in time already expired'),
        })
      );
    }

    if (checkInTime > checkOutTime) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Check-in time must be greater than check-out time'),
        })
      );
    }
    const dailyAmount = residence_details.dailyAmount
    const hourlyAmount = residence_details.hourlyAmount
    calculatedHours = calculateTotalHoursBetween(checkInTime, checkOutTime)

    if (calculatedHours < 1 && residence_details.category.key === 'hotel') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Total stay must be at least one hours for hotel'),
        })
      );
    }
    if (calculatedHours < 12 && residence_details.category.key !== 'hostel') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Total stay must be at least half-day for residences and personal-houses'),
        })
      );
    }
    const totalDays = Math.floor(calculatedHours / 24);
    const hoursCalculated = calculatedHours % 24;
    const totalHours = parseFloat(hoursCalculated.toFixed(2));

    // Calculate total amount for days and remaining hours
    const residenceCharge = Math.ceil(totalDays * dailyAmount + totalHours * hourlyAmount);
    const serviceCharge = Math.ceil(0.06 * residenceCharge);

    // Calculate total amount
    const totalAmount = Math.ceil(residenceCharge + serviceCharge);

    console.log('-------->', totalDays, totalHours, residenceCharge, serviceCharge, totalAmount)

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'booking',
        message: req.t('Booking Time retrieved successfully'),
        data: {
          checkInTime,
          checkOutTime,
          totalHours,
          totalDays,
          residenceCharge,
          serviceCharge,
          totalAmount,
        },
      })
    );
  }
  catch (error) {
    logger.error(error, req.originalUrl)
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
      totalDays,
      totalAmount,
      guestTypes,
      numberOfGuests,
      residenceCharge,
      serviceCharge,
    } = req.body;

    if (!numberOfGuests || !guestTypes || !checkInTime || !checkOutTime || totalDays === null || totalHours === null || totalAmount === null || !residenceId || residenceCharge === null || serviceCharge === null) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '403',
          message: req.t(`Please fill all the fields`),
        })
      );
    }
    // if(!residenceCharge || !serviceCharge){
    //   residenceCharge = Math.ceil(totalAmount * 0.94)
    //   serviceCharge = Math.ceil(totalAmount * 0.06)
    // }

    checkInTime = new Date(checkInTime)
    checkOutTime = new Date(checkOutTime)
    const today = new Date()

    if (checkInTime < today) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Check-in time already expired'),
        })
      );
    }
    if (checkInTime > checkOutTime) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Check-in time must be less than check-out time'),
        })
      );
    }

    if (checkInTime > checkOutTime) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Check-in time must be grater than check-out time'),
        })
      );
    }

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

    const residence_details = await Residence.findById(residenceId).populate(`hostId`);
    if (!residence_details || residence_details.isDeleted) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Residence not found') }));
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
      return res.status(409).json(response({ status: 'Error', statusCode: '409', message: req.t('Residence is already booked for the requested time.') }));
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
      return res.status(409).json(response({ status: 'Error', statusCode: '409', message: req.t('The request already exists, wait for confirmation') }));
    }

    if (checkUser.role === 'user') {
      const booking = new Booking({
        bookingId: await generateCustomID(),
        residenceId,
        checkInTime,
        checkOutTime,
        userId: req.body.userId,
        hostId: residence_details.hostId,
        totalTime: {
          days: totalDays,
          hours: totalHours
        },
        totalAmount,
        userContactNumber: checkUser.phoneNumber,
        guestTypes,
        numberOfGuests,
        residenceCharge,
        serviceCharge,
      });
      await booking.save();
      let popularity = residence_details.popularity
      popularity++
      const residence = {
        popularity
      }
      console.log(popularity, residence)
      await Residence.findByIdAndUpdate(residence_details._id, residence, options)

      const message = checkUser.fullName + ' veut réserver ' + residence_details.residenceName + ' depuis ' + booking.checkInTime + ' à ' + booking.checkOutTime
      const newNotification = {
        message: message,
        receiverId: booking.hostId,
        image: checkUser.image,
        linkId: booking._id,
        type: 'booking',
        role: 'host'
      }
      const notification = await addNotification(newNotification)
      const roomId = booking.hostId._id.toString()
      console.log('room --->', roomId)
      io.to('room' + roomId).emit('host-notification', notification);

      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'booking', message: req.t('Booking added successfully.'), data: booking }));
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are Not authorize to add booking') }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Error added booking') }));
  }
};

//All bookings
const allBooking = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    var bookings;
    let count = 0;

    if (checkUser.role === 'super-admin') {
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
        message: req.t('Bookings retrieved successfully'),
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
    logger.error(error, req.originalUrl)
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting bookings'),
      })
    );
  }
};

const cancelBookingByUser = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    const id = req.params.id
    const { status } = req.body;
    if (!status) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '403',
          message: req.t('Please fill required fields'),
        })
      );
    }
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };

    if (checkUser.role !== 'user') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to cancel booking') }));
    }
    const bookingDetails = await Booking.findById(id).populate('residenceId userId hostId')
    if (!bookingDetails || bookingDetails.isDeleted) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'booking', message: req.t('Booking not found') }));
    }

    if (status === "cancelled") {

      if ((bookingDetails.status === 'pending') || (bookingDetails.status === 'reserved') && (bookingDetails.paymentTypes === 'unknown')) {
        bookingDetails.status = status
        bookingDetails.save()
        const hostMessage = bookingDetails.userId.fullName + ' demande de réservation annulée pour ' + bookingDetails.residenceId.residenceName
        const newNotification = {
          message: hostMessage,
          receiverId: bookingDetails.hostId._id,
          image: bookingDetails.userId.image,
          linkId: bookingDetails._id,
          type: 'booking',
          role: 'host'
        }
        const hostNotification = await addNotification(newNotification)
        const roomId = bookingDetails.hostId._id.toString()
        console.log('room --->', roomId)
        io.to('room' + roomId).emit('host-notification', hostNotification);
        return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('Booking cancelled successfully.'), data: bookingDetails }));
      }
      else if (bookingDetails.status === 'reserved' && bookingDetails.paymentTypes !== 'unknown') {
        const userPayment = await Payment.findOne({ bookingId: bookingDetails._id, userId: checkUser._id, status: "success" }).sort({ createdAt: -1 });
        if (!userPayment || userPayment.paymentTypes === 'pending') {
          return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'payment', message: req.t('Payment has not done yet') }));
        }
        else {
          const residence_details = await Residence.findById(bookingDetails.residenceId._id)
          const paymentTime = new Date(userPayment.createdAt);
          const currentTime = new Date();

          // Calculate the total duration in milliseconds between paymentTime and currentTime
          const totalDurationInMillis = currentTime.getTime() - paymentTime.getTime();

          // Calculate the duration representing 40% of the total duration
          const fortyPercentInMillis = totalDurationInMillis * 0.4;

          // Calculate the time that is 40% of the duration from paymentTime
          const fortyPercentTime = new Date(paymentTime.getTime() + fortyPercentInMillis);
          const stayMoreThanTwoDays = bookingDetails.totalTime.days > 2

          if (fortyPercentTime < currentTime) {
            var income = await Income.findOne({ hostId: checkUser._id })
            if (!income) {
              income = new Income({
                hostId: checkUser._id,
              })
            }
            const amount = Math.ceil(bookingDetails.totalAmount * 0.98)
            income.pendingAmount += amount
            income.totalIncome += amount
            await income.save()

            bookingDetails.status = status
            bookingDetails.save()
            residence_details.status = 'active'
            await residence_details.save()
            return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('You have been refunded excluding refund charge. Please check your wallet'), data: bookingDetails }));
          }
          else if (stayMoreThanTwoDays && fortyPercentTime > currentTime) {
            var income = await Income.findOne({ hostId: checkUser._id })
            if (!income) {
              income = new Income({
                hostId: checkUser._id,
              })
            }
            const amount = Math.ceil(bookingDetails.totalAmount * 0.48)
            income.pendingAmount += amount
            income.totalIncome += amount
            await income.save()

            const hostIncome = await Income.findOne({ hostId: bookingDetails.hostId._id })
            if (!hostIncome) {
              hostIncome = new Income({
                hostId: bookingDetails.hostId._id,
              })
            }
            const hostAmount = Math.ceil(bookingDetails.totalAmount * 0.30)
            hostIncome.pendingAmount += hostAmount
            hostIncome.totalIncome += hostAmount
            await hostIncome.save()

            const hostMessage = bookingDetails.userId.fullName + ' demande de réservation annulée pour ' + bookingDetails.residenceId.residenceName + ' et vous avez été remboursé ' + hostAmount + ' FCFA. Veuillez vérifier votre portefeuille.'
            const newNotification = {
              message: hostMessage,
              receiverId: bookingDetails.hostId._id,
              image: bookingDetails.userId.image,
              linkId: bookingDetails._id,
              type: 'booking',
              role: 'host'
            }
            const hostNotification = await addNotification(newNotification)
            const roomId = bookingDetails.hostId._id.toString()
            console.log('room --->', roomId)
            io.to('room' + roomId).emit('host-notification', hostNotification);

            adminMessage = bookingDetails.userId.fullName + ' demande de réservation annulée pour ' + bookingDetails.residenceId.residenceName + ' et tu as été remboursé ' + bookingDetails.totalAmount * 0.20 + ' FCFA'
            const superAdminNotif = {
              message: adminMessage,
              receiverId: bookingDetails.hostId._id,
              image: bookingDetails.userId.image,
              linkId: bookingDetails._id,
              type: 'booking',
              role: 'super-admin'
            }
            const superAdminNotification = await addNotification(superAdminNotif)
            io.emit('super-admin-notification', superAdminNotification);

            bookingDetails.status = status
            bookingDetails.save()

            residence_details.status = 'active'
            await residence_details.save()

            return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('You have been refunded excluding refund charge. Please check your wallet'), data: bookingDetails }));
          }
          else {
            var income = await Income.findOne({ hostId: bookingDetails.hostId._id })
            if (!income) {
              income = new Income({
                hostId: bookingDetails.hostId._id,
              })
            }
            const amount = bookingDetails.residenceCharge
            income.pendingAmount += amount
            income.totalIncome += amount
            await income.save()

            const hostMessage = bookingDetails.userId.fullName + ' demande de réservation annulée pour ' + bookingDetails.residenceId.residenceName + ' et tu as été remboursé ' + amount + ' FCFA. Veuillez vérifier votre portefeuille'
            const newNotification = {
              message: hostMessage,
              receiverId: bookingDetails.hostId._id,
              image: bookingDetails.userId.image,
              linkId: bookingDetails._id,
              type: 'booking',
              role: 'host'
            }
            const hostNotification = await addNotification(newNotification)
            const roomId = bookingDetails.hostId._id.toString()
            io.to('room' + roomId).emit('host-notification', hostNotification);

            bookingDetails.status = status
            bookingDetails.save()

            residence_details.status = 'active'
            await residence_details.save()

            return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('Booking request cancelled but as the time frame specified by the refund policy has expired, so no refund can be processed at this time'), data: bookingDetails }));
          }
        }
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'booking', message: req.t('You can not cancel booking') }));
      }
    }
    else {
      return res.status(400).json(response({ status: 'Error', type: "booking", statusCode: '400', message: req.t("Booking status not appropiate") }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error)
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
  }
}

const refundPolicy = async (req, res) => {
  try {
    const id = req.params.id;
    const bookingDetails = await Booking.findById(id).populate('residenceId userId hostId');

    if ((!bookingDetails || bookingDetails.isDeleted) && bookingDetails.paymentTypes !== 'unknown') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'booking', message: req.t('Refund details not available') }));
    }
    const userPayment = await Payment.findOne({ bookingId: bookingDetails._id, userId: req.body.userId, status: "success" }).sort({ createdAt: -1 });

    if (!userPayment || userPayment.paymentTypes === 'pending') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'payment', message: req.t('Payment has not been completed yet') }));
    }

    const currentTime = new Date();

    const paymentTime = new Date(userPayment.createdAt);

    // Calculate the total duration in milliseconds between paymentTime and currentTime
    const totalDurationInMillis = currentTime.getTime() - paymentTime.getTime();

    // Calculate the duration representing 40% of the total duration
    const fortyPercentInMillis = totalDurationInMillis * 0.4;

    // Calculate the time that is 40% of the duration from paymentTime
    const fortyPercentTime = new Date(paymentTime.getTime() + fortyPercentInMillis);

    const stayMoreThanTwoDays = bookingDetails.totalTime.days > 2;

    var message = `You are eligible for a refund until ${fortyPercentTime.toISOString()} (40% of time elapsed since payment).`

    var minimumRefund = `You can get ${stayMoreThanTwoDays ? '50%' : '0%'} refund by cancelling before check-in time.`

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'booking',
        message: req.t('Refund policy retrieved successfully'),
        data: {
          message,
          minimumRefund
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
        message: req.t('Error getting refund policy'),
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
          message: req.t('Please fill all the fields'),
        })
      );
    }
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    const bookingDetails = await Booking.findById(id).populate('residenceId userId hostId')
    if (!bookingDetails || bookingDetails.isDeleted) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'booking', message: req.t('Booking not found') }));
    }
    if (checkUser.role === 'host') {
      if (bookingDetails.hostId._id.toString() !== checkUser._id.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'booking', message: req.t('This is not your residence') }));
      }
      if (status === 'reserved') {
        if (bookingDetails.status === 'pending') {
          const existingBookings = await Booking.findOne({
            residenceId: bookingDetails.residenceId._id,
            status: 'reserved',
            $or: [
              {
                $and: [
                  { checkInTime: { $lte: bookingDetails.checkInTime } },
                  { checkOutTime: { $gte: bookingDetails.checkInTime } },
                ]
              },
              {
                $and: [
                  { checkInTime: { $lte: bookingDetails.checkOutTime } },
                  { checkOutTime: { $gte: bookingDetails.checkOutTime } },
                ]
              }
            ]
          });

          if (existingBookings) {
            return res.status(409).json(response({ status: 'Error', statusCode: '409', message: req.t('Residence is already booked for the requested time.') }));
          }
          const updated_residence = {
            status
          }
          await Residence.findByIdAndUpdate(bookingDetails.residenceId, updated_residence, options);

          const currentTime = new Date()
          const checkInTime = new Date(bookingDetails.checkInTime)
          const remainingHours = calculateTotalHoursBetween(currentTime, checkInTime)
          const exactHours = Math.floor(remainingHours);
          const exactMinutes = Math.round((remainingHours - exactHours) * 60);
          const remainingNinetyPercent = remainingHours * 0.1
          const remainingTimeToPay = remainingHours * 60 * 60 * 40 // hours to mili-second and then taking 40% of it --> 60*40/100 = 24

          bookingDetails.status = status
          bookingDetails.save()

          const adminMessage = bookingDetails.userId.fullName + ' réservée ' + bookingDetails.residenceId.residenceName
          const userMessage = bookingDetails.hostId.fullName + ' accepté votre demande de réservation pour ' + bookingDetails.residenceId.residenceName + ', et vous devez payer dans les délais ' + exactHours + ' heures et ' + exactMinutes + ' minutes'

          const newNotification = [{
            message: adminMessage,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            role: 'super-admin',
            type: 'booking'
          }, {
            message: userMessage,
            receiverId: bookingDetails.userId._id,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            role: 'user',
            type: 'booking'
          }]

          const userNotification = await addManyNotifications(newNotification)
          const adminNotification = await getAllNotification('super-admin', 10, 1)
          io.emit('super-admin-notification', adminNotification);
          const roomId = bookingDetails.userId._id.toString()
          console.log('room --->', roomId)
          io.to('room' + roomId).emit('user-notification', userNotification);

          setTimeout(async () => {
            const bookingDetails = await Booking.findById(id).populate('residenceId');
            if (bookingDetails.paymentTypes === 'unknown') {
              const userMessage = bookingDetails.hostId.fullName + ' accepté votre demande de réservation pour ' + bookingDetails.residenceId.residenceName + ', et vous devez payer dans les délais ' + remainingNinetyPercent + ' hours'

              const newNotification = {
                message: userMessage,
                receiverId: bookingDetails.userId._id,
                image: bookingDetails.userId.image,
                linkId: bookingDetails._id,
                role: 'user',
                type: 'booking'
              }
              const userNotification = await addNotification(newNotification)
              const roomId = bookingDetails.userId._id.toString()
              io.to('room' + roomId).emit('user-notification', userNotification);
            }
          }, remainingTimeToPay * 0.8);

          // Set up setTimeout for 100% of the remaining time to pay
          setTimeout(async () => {
            const bookingDetails = await Booking.findById(id).populate('residenceId userId');
            if (bookingDetails.paymentTypes === 'unknown') {
              bookingDetails.status = 'cancelled'
              await bookingDetails.save()

              //updating residence status to active
              const residenceInfo = await Residence.findById(bookingDetails.residenceId._id)
              residenceInfo.status = 'active'
              await residenceInfo.save()

              const userMessage = 'Votre demande de réservation pour ' + bookingDetails.residenceId.residenceName + ' automatiquement annulé pour non-paiement dans les délais'

              const hostMessage = bookingDetails.residenceId.residenceName + ' demande de réservation automatiquement annulée pour non-paiement dans les délais'

              const newNotification = {
                message: userMessage,
                receiverId: bookingDetails.userId._id,
                image: bookingDetails.userId.image,
                linkId: bookingDetails._id,
                role: 'user',
                type: 'booking'
              }
              const userNotification = await addNotification(newNotification)
              const roomId = bookingDetails.userId._id.toString()
              io.to('room' + roomId).emit('user-notification', userNotification);

              const hostNotif = {
                message: hostMessage,
                receiverId: bookingDetails.hostId._id,
                image: bookingDetails.userId.image,
                linkId: bookingDetails._id,
                role: 'host',
                type: 'booking'
              }
              const hostNotification = await addNotification(hostNotif)
              const hostRoomId = bookingDetails.hostId._id.toString()
              io.to('room' + hostRoomId).emit('host-notification', hostNotification);
            }
          }, remainingTimeToPay);

          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('Booking edited successfully.'), data: bookingDetails }));
        }
        else {
          return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'booking', message: req.t('Your booking-request update credentials not match') }));
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
          const userMessage = bookingDetails.hostId.fullName + ' annulé votre demande de réservation pour ' + bookingDetails.residenceId.residenceName

          const newNotification = {
            message: userMessage,
            receiverId: bookingDetails.userId._id,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            role: 'user',
            type: 'booking'
          }
          const userNotification = await addNotification(newNotification)
          const roomId = bookingDetails.userId._id.toString()
          io.to('room' + roomId).emit('user-notification', userNotification);

          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('Booking edited successfully.'), data: bookingDetails }));
        }
        if (bookingDetails.status === 'reserved') {
          if (bookingDetails.paymentTypes === 'unknown') {
            bookingDetails.status = status
            bookingDetails.save()
            const userMessage = bookingDetails.hostId.fullName + ' annulé votre demande de réservation pour ' + bookingDetails.residenceId.residenceName

            const newNotification = {
              message: userMessage,
              receiverId: bookingDetails.userId._id,
              image: bookingDetails.userId.image,
              linkId: bookingDetails._id,
              role: 'user',
              type: 'booking'
            }
            const userNotification = await addNotification(newNotification)
            const roomId = bookingDetails.userId._id.toString()
            io.to('room' + roomId).emit('user-notification', userNotification);

            return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('Booking edited successfully.'), data: bookingDetails }));
          }
          else {
            return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'booking', message: req.t('You can not cancel reservation when user already paid') }));
          }
        }
        else {
          return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'booking', message: req.t('Your booking-request update credentials not match') }));
        }
      }
      else {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: "booking-request", message: req.t('Your booking-request update credentials not match') }));
      }
      //----->end
    }
    else if (checkUser.role === 'user') {
      if (bookingDetails.userId._id.toString() !== checkUser._id.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'booking', message: req.t('You are not authorised to access this booking request') }));
      }
      if (status === 'check-in') {
        if (bookingDetails.paymentTypes === 'full-payment' && bookingDetails.status === 'reserved') {
          const today = new Date()
          const checkInTime = new Date(bookingDetails.checkInTime)
          if (process.env.NODE_ENV === 'production' && today < checkInTime) {
            return res.status(409).json(response({
              status: 'Error',
              statusCode: '409',
              type: 'booking',
              message: `You can't check-in until ${checkInTime}.`,
            }));
          }
          bookingDetails.status = status
          bookingDetails.save()

          var hostIncome = await Income.findOne({ hostId: bookingDetails.hostId._id })
          if (!hostIncome) {
            hostIncome = new Income({
              hostId: bookingDetails.hostId._id,
            })
          }
          //charge 1% of total amount
          const incomeAmount = Math.floor(bookingDetails.residenceCharge * 0.99)

          const residence = await Residence.findById(bookingDetails.residenceId)
          residence.status = 'active'
          await residence.save()

          const totalIncome = hostIncome.totalIncome + incomeAmount
          const pendingIncome = hostIncome.pendingAmount + incomeAmount

          hostIncome.totalIncome = totalIncome;
          hostIncome.pendingAmount = pendingIncome;

          await hostIncome.save();

          const hostMessage = bookingDetails.userId.fullName + ' enregistré et en attente de la clé pour ' + bookingDetails.residenceId.residenceName + '. Les frais de séjour ont également été transférés sur votre portefeuille.'

          const newNotification = {
            message: hostMessage,
            receiverId: bookingDetails.hostId._id,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            role: 'host',
            type: 'booking'
          }
          const hostNotification = await addNotification(newNotification)
          const roomId = bookingDetails.hostId._id.toString()
          io.to('room' + roomId).emit('host-notification', hostNotification);

          const accessToken = process.env.ORANGE_ACCESS_KEY
          const senderNumber = process.env.ORANGE_SENDER_NUMBER
          const receiverNumber = bookingDetails.hostId.phoneNumber
          const url = `https://api.orange.com/smsmessaging/v1/outbound/${senderNumber}/requests`

          //await sendSMS(url, senderNumber, receiverNumber, hostMessage, accessToken)
          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('Booking edited successfully.'), data: bookingDetails }));
        }
        else {
          return res.status(409).json(response({ status: 'Error', statusCode: '409', type: "booking-request", message: req.t('You must pay atleast 50% to check-in') }));
        }
      }
      else if (status === "check-out") {
        if (bookingDetails.paymentTypes === 'full-payment' && bookingDetails.status === 'check-in') {
          bookingDetails.status = status
          bookingDetails.save()


          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: req.t('Booking edited successfully.'), data: bookingDetails }));
        }
        else {
          return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'booking', message: req.t('Your need to clear full payment and must be checked-in') }));
        }
      }
      else {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: "booking-request", message: req.t('Your booking-request update credentials not match') }));
      }
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are Not authorize to edit booking') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Error in editing booking') }));
  }
};

//booking details
const bookingDetails = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const id = req.params.id

    var booking
    if (checkUser.role === 'super-admin') {
      booking = await Booking.findById(id).populate('hostId userId').exec();
    }
    else if (checkUser.role === 'host' || checkUser.role === 'user') {
      booking = await Booking.findById(id).populate('hostId userId residenceId').exec();
    }
    if (booking && !booking?.isDeleted) {
      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '200',
          type: 'booking',
          message: req.t('Booking retrieved successfully'),
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
          message: req.t('Booking not found'),
          type: 'booking',
        })
      );
    }
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting bookings'),
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
    logger.error(error, req.originalUrl)
    console.log(error)
  }
}

const bookingDashboardRatio = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    const year = !req.query.year ? new Date() : new Date(req.query.year)
    const conditionalYear = year.getFullYear()
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };

    if (checkUser.role === 'super-admin') {
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

      return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'booking', message: req.t('Booking ratio is successfully retrieved'), data: data }));
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to get monthly ratio') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error)
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Server not responding') }));
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
          message: req.t('Please fill all the fields'),
        })
      );
    }
    if (!checkHost || checkHost.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (checkHost.role === 'user') {
      const bookingDetails = await Booking.findOne({ _id: id })
      if (!bookingDetails) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Booking not found') }));
      }
      console.log(bookingDetails.userId.toString(), req.body.userId.toString())
      if (bookingDetails.userId.toString() !== req.body.userId.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to delete this booking') }));
      }
      if (!bookingDetails.isDeleted && bookingDetails.status === 'pending') {
        await Booking.findByIdAndDelete(id)
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'booking', message: req.t('Booking deleted successfully.'), data: bookingDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "booking", message: req.t('Delete credentials not match') }));
      }
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are Not authorize to add booking') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Error deleted booking') }));
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
          message: req.t('Please fill all the fields'),
        })
      );
    }
    if (!checkHost || checkHost.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    if (checkHost.role === 'user') {
      const bookingDetails = await Booking.findOne({ _id: id })
      if (!bookingDetails) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Booking not found') }));
      }
      //console.log(bookingDetails.userId.toString(), req.body.userId.toString())
      if (bookingDetails.userId.toString() !== req.body.userId.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to delete this booking') }));
      }
      if (!bookingDetails.isDeleted && !bookingDetails.isUserHistoryDeleted && bookingDetails.status === 'check-out') {
        bookingDetails.isUserHistoryDeleted = true
        await bookingDetails.save()
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'booking', message: req.t('Booking deleted successfully.'), data: bookingDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "booking", message: req.t('Delete credentials not match') }));
      }
    }
    else if (checkHost.role === 'host') {
      const bookingDetails = await Booking.findOne({ _id: id })
      if (!bookingDetails) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Booking not found') }));
      }
      //console.log(bookingDetails.userId.toString(), req.body.userId.toString())
      if (bookingDetails.hostId.toString() !== req.body.userId.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are not authorised to delete this booking') }));
      }
      if (!bookingDetails.isDeleted && !bookingDetails.isHostHistoryDeleted && bookingDetails.status === 'check-out') {
        bookingDetails.isHostHistoryDeleted = true
        await bookingDetails.save()
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'booking', message: req.t('Booking deleted successfully.'), data: bookingDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "booking", message: req.t('Delete credentials not match') }));
      }
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: req.t('You are Not authorize to add booking') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Error deleted booking') }));
  }
}

module.exports = { addBooking, allBooking, updateBooking, bookingDetails, bookingDashboardCount, bookingDashboardRatio, deleteBooking, calculateTimeAndPrice, deleteHistory, cancelBookingByUser, refundPolicy };