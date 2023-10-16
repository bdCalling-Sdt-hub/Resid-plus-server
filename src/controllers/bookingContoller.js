const response = require("../helpers/response");
const Booking = require("../models/Booking");
const Residence = require("../models/Residence");
const generateCustomID = require('../helpers/generateCustomId');
//a helper function to calculate hours between two date-time
const calculateTotalHoursBetween = require('../helpers/calculateTotalHours')
const User = require("../models/User");
const { addNotification, addManyNotifications, getAllNotification } = require("./notificationController");
const options = { new: true };

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
    if(!residence_details){
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
    const hourlyAmount = Math.ceil(residence_details.hourlyAmount)
    const totalHours = Math.ceil(calculateTotalHoursBetween(checkInTime, checkOutTime))
    const totalAmount = Math.ceil(totalHours * hourlyAmount)
    
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
      totalPerson,
      checkInTime,
      checkOutTime,
      totalHours,
      totalAmount,
      guestTypes
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

    //****
    //checkInTime and checkOutTime format = 2023-09-18T14:30:00
    //****
    //calculating total hours -> amount

    if (checkUser.role === 'user') {
      const booking = new Booking({
        bookingId: await generateCustomID(),
        residenceId,
        totalPerson,
        checkInTime,
        checkOutTime,
        userId: req.body.userId,
        hostId: residence_details.hostId,
        totalHours,
        totalAmount,
        userContactNumber: checkUser.phoneNumber,
        guestTypes
      });
      await booking.save();
      let popularity = residence_details.popularity
      popularity++
      const residence = {
        popularity
      }
      console.log(popularity, residence)
      await Residence.findByIdAndUpdate(residence_details._id, residence, options)
      const message = checkUser.fullName + ' wants to book ' + residence_details.residenceName + ' from ' + checkInTime + ' to ' + checkOutTime
      const newNotification = {
        message: message,
        receiverId: booking.hostId,
        image: checkUser.image,
        linkId: booking._id,
        type: 'host'
      }
      await addNotification(newNotification)
      const notification = await getAllNotification('host', 6, 1, booking.hostId)
      io.to('room' + booking.hostId).emit('host-notification', notification);
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
          status: { $nin: ['pending', 'check-out'] }
        }
      }
      else if (bookingTypes === "history") {
        filter = {
          status: { $eq: 'check-out' }
        }
      }
      else {
        filter = {
          status: { $eq: 'pending' }
        }
      }

      bookings = await Booking.find({
        hostId: checkUser._id,
        isDeleted: false,
        ...filter
      })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId hostId residenceId');
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
          status: { $eq: 'check-out' }
        }
      }
      bookings = await Booking.find({
        userId: checkUser._id,
        isDeleted: false,
        ...filter
      })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId hostId residenceId');
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
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    const bookingDetails = await Booking.findById(id).populate('residenceId userId hostId')
    if (!bookingDetails || bookingDetails.isDeleted) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'booking', message: 'Booking not found' }));
    }
    if (checkUser.role === 'host') {
      //changing residence status to reserved or cancelled
      //----->start
      const bookingDetails = await Booking.findById(id).populate('residenceId userId hostId')
      if (!bookingDetails || bookingDetails.isDeleted) {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'booking', message: 'Booking not found' }));
      }
      //console.log('HELLO------------------------------>', bookingDetails, bookingDetails.hostId._id.toString(), checkUser._id.toString())
      if (bookingDetails.hostId._id.toString() !== checkUser._id.toString()) {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'booking', message: 'This is not your residence' }));
      }
      if (status === 'reserved' && bookingDetails.status === 'pending') {
        const updated_residence = {
          status
        }
        await Residence.findByIdAndUpdate(bookingDetails.residenceId, updated_residence, options);

        bookingDetails.status = status
        bookingDetails.save()

        const adminMessage = bookingDetails.userId.fullName + ' booked ' + bookingDetails.residenceId.residenceName
        const userMessage = bookingDetails.hostId.fullName + ' accepted your booking request'

        const newNotification = [{
          message: adminMessage,
          image: bookingDetails.userId.image,
          linkId: bookingDetails._id,
          type: 'admin'
        }, {
          message: userMessage,
          receiverId: bookingDetails.userId._id,
          image: bookingDetails.userId.image,
          linkId: bookingDetails._id,
          type: 'user'
        }]
        await addManyNotifications(newNotification)
        const adminNotification = await getAllNotification('admin')
        io.emit('admin-notification', adminNotification);
        const userNotification = await getAllNotification('user', 6, 1, bookingDetails.userId._id)
        console.log(adminNotification, userNotification)
        io.to('room' + bookingDetails.userId._id).emit('user-notification', userNotification);

        return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: bookingDetails }));
      }
      else if (status === 'cancelled' && bookingDetails.status === 'pending') {
        bookingDetails.status = status
        bookingDetails.save()
        const userMessage = bookingDetails.hostId.fullName + ' cancelled your booking request'

        const newNotification = {
          message: userMessage,
          receiverId: bookingDetails.userId._id,
          image: bookingDetails.userId.image,
          linkId: bookingDetails._id,
          type: 'user'
        }
        await addNotification(newNotification)
        const userNotification = await getAllNotification('user', 6, 1, bookingDetails.userId._id)
        console.log(userNotification)
        io.to('room' + bookingDetails.userId._id).emit('user-notification', userNotification);

        return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: bookingDetails }));
      }
      else {
        return res.status(401).json(response({ status: 'Error', statusCode: '401', type: "booking-request", message: 'Your booking-request update credentials not match' }));
      }
      //----->end
    }
    else if (checkUser.role === 'user') {
      if (status === 'check-in' && bookingDetails.paymentTypes!=='unknown') {
        bookingDetails.status = status
        bookingDetails.save()
        const hostMessage = bookingDetails.userId.fullName + ' checked-in to ' + bookingDetails.residenceId.residenceName

        const newNotification = {
          message: hostMessage,
          receiverId: bookingDetails.hostId._id,
          image: bookingDetails.userId.image,
          linkId: bookingDetails._id,
          type: 'host'
        }
        await addNotification(newNotification)
        const hostNotification = await getAllNotification('host', 6, 1, bookingDetails.hostId._id)
        console.log(hostNotification)
        io.to('room' + bookingDetails.hostId._id).emit('host-notification', hostNotification);

        return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: bookingDetails }));
      }
      else if(status==="check-out"){
        if(bookingDetails.paymentTypes==='full-payment'){
          bookingDetails.status = status
          bookingDetails.save()
          const hostMessage = bookingDetails.userId.fullName + ' checked-out from ' + bookingDetails.residenceId.residenceName

          const newNotification = {
            message: hostMessage,
            receiverId: bookingDetails.hostId._id,
            image: bookingDetails.userId.image,
            linkId: bookingDetails._id,
            type: 'host'
          }
          await addNotification(newNotification)
          const hostNotification = await getAllNotification('host', 6, 1, bookingDetails.hostId._id)
          console.log(hostNotification)
          io.to('room' + bookingDetails.hostId._id).emit('host-notification', hostNotification);

          return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: bookingDetails }));
        }
        else{
          return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'booking', message: 'You are not authorised to check-out without full-payment', data: bookingDetails }));
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

//Implementable after payment integration
// const updateBooking = async (req, res) => {
//   console.log(req.body)
//   try {
//     const checkUser = await User.findById(req.body.userId);
//     //extracting the booking id from param that is going to be edited
//     const id = req.params.id
//     const { status } = req.body;
//     if (!checkUser) {
//       return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
//     };
//     if (checkUser.role === 'host') {
//       var updated_residence

//       //changing residence status to reserved
//       //----->start
//       const bookingDetails = await Booking.findById(id).populate('residenceId userId')
//       if (status) {
//         if (status === 'reserved' && bookingDetails.status === 'pending') {
//           updated_residence = {
//             status
//           }
//         }
//         else if (status === 'reserved' && bookingDetails.status !== 'pending') {
//           return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'Cant update bookings status to reserced as its already reserved' }));
//         }
//         //booking cancellation with payment
//         else if(status === 'cancelled' && bookingDetails.status === 'reserved' && bookingDetails.paymentTypes !== 'unknown'){
//           // more things to add after payment integration
//           updated_residence = {
//             status
//           }
//         }
//         //booking cancellation without payment
//         else if(status === 'cancelled' && bookingDetails.status === 'reserved' && bookingDetails.paymentTypes === 'unknown'){
//           // as no payment is done, so no need to refund
//           updated_residence = {
//             status
//           }
//         }
//         //booking check-in
//         else if(status === 'check-in' && bookingDetails.status === 'reserved' && bookingDetails.paymentTypes !== 'unknown'){
//           // more things to add after payment integration
//           updated_residence = {
//             status
//           }
//         }
//         //booking check-in without payment not possible
//         else if(status === 'check-in' && bookingDetails.status === 'reserved' && bookingDetails.paymentTypes === 'unknown'){
//           // more things to add after payment integration
//           return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'Cant update bookings status to check-in as payment is not done yet' }));
//         }
//         //booking check-out
//         else if(status === 'check-out' && bookingDetails.status === 'reserved' && bookingDetails.paymentTypes !== 'unknown'){
//           // more things to add after payment integration
//           updated_residence = {
//             status
//           }
//         }
//         //booking check-out without payment not possible
//         else if(status === 'check-out' && bookingDetails.status === 'reserved' && bookingDetails.paymentTypes !== 'full-payment'){
//           // more things to add after payment integration
//           return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'Cant update bookings status to check-out as full-payment is not done yet' }));
//         }
//         await Residence.findByIdAndUpdate(bookingDetails.residenceId, updated_residence, options);
//         const message = bookingDetails.userId.fullName + ' booked ' + bookingDetails.residenceId.residenceName

//         const newNotification = {
//           message: message,
//           image: bookingDetails.userId.image,
//           linkId: bookingDetails._id,
//           type: 'admin'
//         }
//         const notification = await addNotification(newNotification)
//         io.emit('admin-notification', notification);
//       }
//       else {
//         return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'Cant update bookings' }));
//       }
//       //----->end

//       const result = await Booking.findByIdAndUpdate(id, booking, options);
//       console.log(result)
//       return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'booking', message: 'Booking edited successfully.', data: result }));
//     } else {
//       return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add booking' }));
//     }
//   }
//   catch (error) {
//     console.error(error);
//     //deleting the images if something went wrong

//     return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error added booking' }));
//   }
// };

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
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to delete this booking 2' }));
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
        return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to delete this booking 2' }));
      }
      if (!bookingDetails.isDeleted && bookingDetails.status === 'pending') {
        bookingDetails.isDeleted = true
        await bookingDetails.save()
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'booking', message: 'Booking deleted successfully.', data: bookingDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "booking", message: 'Delete credentials not match' }));
      }
    } 
    // else if (checkHost.role === 'user') {
    //   const bookingDetails = await Booking.findOne({ _id: id })
    //   if (!bookingDetails) {
    //     return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking not found' }));
    //   }
    //   //console.log(bookingDetails.userId.toString(), req.body.userId.toString())
    //   if (bookingDetails.userId.toString() !== req.body.userId.toString()) {
    //     return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorised to delete this booking 2' }));
    //   }
    //   if (!bookingDetails.isDeleted && bookingDetails.status === 'pending') {
    //     bookingDetails.isDeleted = true
    //     await bookingDetails.save()
    //     return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'booking', message: 'Booking deleted successfully.', data: bookingDetails }));
    //   }
    //   else {
    //     return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "booking", message: 'Delete credentials not match' }));
    //   }
    // } 
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