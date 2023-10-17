const response = require("../helpers/response");
const Payment = require("../models/Payment");
const Booking = require('../models/Booking')
const User = require("../models/User");
const kkiapay = require('kkiapay-nodejs-sdk')
const { addNotification, getAllNotification } = require('./notificationController')

//Add payment
const addPayment = async (req, res) => {
  try {
    const {
      paymentData,
      bookingId,
      paymentTypes
    } = req.body;
    const checkUser = await User.findById(req.body.userId);

    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found 2' }));
    };

    console.log("paymentTypes----------->", paymentTypes)
    if(paymentTypes !== 'half-payment' && paymentTypes !== 'full-payment'){
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Payment status not not appropiate' }));
    }
    const bookingDetails = await Booking.findById(bookingId).populate('residenceId');
    console.log("bookingDetails--------->", bookingDetails, bookingId)
    if (!bookingDetails) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking not found' }));
    };

    if (checkUser.role === 'user' && bookingDetails.userId.toString() === req.body.userId) {
      const payment = new Payment({
        paymentData,
        bookingId,
        userId: req.body.userId,
        hostId: bookingDetails.hostId,
        residenceId: bookingDetails.residenceId
      });

      await payment.save();
      console.log("payment Details--------->", payment)
      bookingDetails.paymentTypes = paymentTypes;
      await bookingDetails.save();

      const message = checkUser.fullName + ' wants to book ' + bookingDetails.residenceId.residenceName + ' from ' + bookingDetails.checkInTime + ' to ' + bookingDetails.checkOutTime + ' , also completed '+ paymentTypes
      const newNotification = {
        message: message,
        receiverId: bookingDetails.hostId,
        image: checkUser.image,
        linkId: bookingDetails._id,
        type: 'host'
      }
      await addNotification(newNotification)
      const notification = await getAllNotification('host', 6, 1, bookingDetails.hostId)
      io.to('room' + bookingDetails.hostId).emit('host-notification', notification);
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'payment', message: 'Payment added successfully.', data: payment }));
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add payment' }));
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
  }
};

//All payments
const allPayment = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    }
    const filter = {
      status: { $eq: 'accepted' }
    };

    const requestType = !req.query.requestType ? 'total' : req.query.requestType;
    var data
    if (requestType === 'total') {
      const allPayments = await Payment.find({ hostId: req.body.userId, ...filter });
      const totalIncome = allPayments.reduce((total, payment) => total + payment?.paymentData?.requestData?.amount, 0);
      data = totalIncome
    }
    else if (requestType === 'daily') {
      const dayTime = 24 * 60 * 60 * 1000;
      const dayEndDate = new Date();
      const dayStartDate = new Date(dayEndDate - dayTime);
      const allPayments = await Payment.find({ createdAt: { $gte: dayStartDate, $lt: dayEndDate }, hostId: req.body.userId, ...filter }).populate('bookingId residenceId');
      const total = allPayments.reduce((total, payment) => total + payment?.paymentData?.requestData?.amount, 0);
      data = { allPayments, total }
    }
    else if (requestType === 'weekly') {
      const weeklyTime = 7 * 24 * 60 * 60 * 1000
      weeklyStartDate = new Date(new Date().getTime() - weeklyTime);
      weeklyEndDate = new Date();
      const allPayments = await Payment.find({ createdAt: { $gte: weeklyStartDate, $lt: weeklyEndDate }, hostId: req.body.userId, ...filter }).populate('bookingId residenceId');
      const total = allPayments.reduce((total, payment) => total + payment?.paymentData?.requestData?.amount, 0);
      data = { allPayments, total }

      function getWeekNumber(date) {
        const oneJan = new Date(date.getFullYear(), 0, 1);
        const dayOfWeek = oneJan.getDay();
        const numberOfDaysToAdd = dayOfWeek > 0 ? 7 - dayOfWeek : 0;
        oneJan.setDate(oneJan.getDate() + numberOfDaysToAdd);
        const timeDiff = date - oneJan;
        const weekNo = Math.ceil(timeDiff / (7 * 24 * 60 * 60 * 1000))
        console.log("week calculation---------->", oneJan, dayOfWeek, numberOfDaysToAdd, timeDiff, weekNo)
        return weekNo;
      }

      const weekNumber = getWeekNumber(weeklyStartDate);
      data = {
        weekNumber,
        total,
        allPayments
      }

    }
    else if (requestType === 'monthly') {
      const noOfMonth = !req.query.noOfMonth ? 12 : req.query.noOfMonth;
      const monthTime = noOfMonth * 30 * 7 * 24 * 60 * 60 * 1000;
      const monthEndDate = new Date();
      const monthStartDate = new Date(monthEndDate - monthTime);

      const allPayments = await Payment.find({ createdAt: { $gte: monthStartDate, $lt: monthEndDate }, hostId: req.body.userId, ...filter });

      const totalPaymentsByMonth = {};

      allPayments.forEach(payment => {
        const year = payment.createdAt.getFullYear();
        const month = payment.createdAt.getMonth() + 1;

        const key = `${month}-${year}`;
        if (!totalPaymentsByMonth[key]) {
          totalPaymentsByMonth[key] = 0;
        }

        totalPaymentsByMonth[key] += payment?.paymentData?.amount;
      });
      data = totalPaymentsByMonth
    }
    else {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Request type not found' }));
    }

    return res.status(200).json({
      data
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: 'Error getting payments',
      })
    );
  }
};

const refund = async (req, res) => {
  // const id = req.params.id
  // const payment = await Payment.findById(id)
  const k = kkiapay({
    privatekey: "tpk_7caf8122697911ee8d09fb6ffe60742d",
    publickey: "7caf8120697911ee8d09fb6ffe60742d",
    secretkey: "tsk_7caf8123697911ee8d09fb6ffe60742d",
    sandbox: true
  })
  // k.verify("zy0L-Mfrw").
  //   then((response) => {
  //     res.status(200).json(response)
  //   }).
  //   catch((error) => {
  //     res.status(500).json(error)
  //   })
  // k.refund("zy0L-Mfrw").
  //   then((response) => {
  //     res.status(200).json(response)
  //   }).
  //   catch((error) => {
  //     res.status(500).json(error)
  //   })
  k.refund("zy0L-Mfrw", { amount: 300 }) // Specify the refund amount here
    .then((response) => {
      res.status(200).json(response);
    })
    .catch((error) => {
      res.status(500).json(error);
    });

}

//payments details
// const paymentDetails = async (req, res) => {
//   try {
//     const checkUser = await User.findOne({ _id: req.body.userId });
//     const id = req.params.id
//     if (!checkUser) {
//       return res.status(404).json(
//         response({
//           status: 'Error',
//           statusCode: '404',
//           message: 'User not found',
//         })
//       );
//     }

//     const payments = await Payment.findById(id);

//     return res.status(200).json(
//       response({
//         status: 'OK',
//         statusCode: '200',
//         type: 'payment',
//         message: 'Payment retrieved successfully',
//         data: {
//           payments
//         },
//       })
//     );
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json(
//       response({
//         status: 'Error',
//         statusCode: '500',
//         message: 'Error getting payments',
//       })
//     );
//   }
// };


module.exports = { addPayment, allPayment, refund };