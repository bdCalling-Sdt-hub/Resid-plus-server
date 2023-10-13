const response = require("../helpers/response");
const Payment = require("../models/Payment");
const Booking = require('../models/Booking')
const User = require("../models/User");

//Add payment
const addPayment = async (req, res) => {
  try {
    const {
      paymentData,
      bookingId
    } = req.body;
    const checkUser = await User.findById(req.body.userId);

    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found 2' }));
    };

    const bookingDetails = await Booking.findById(bookingId);
    if (!bookingDetails) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking not found' }));
    };

    if (checkUser.role === 'user' && bookingDetails.userId.toString() === req.body.userId) {
      const payment = new Payment({
        paymentData,
        bookingId,
        userId: req.body.userId,
        hostId: bookingDetails.hostId,
      });

      await payment.save();

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
    if(!checkUser){
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    }
    const requestType = !req.query.requestType ? 'total' : req.query.requestType;
    var data
    if (requestType === 'total') {
      const allPayments = await Payment.find();
      const totalIncome = allPayments.reduce((total, payment) => total + payment.paymentData.amount, 0);
      data = totalIncome
    } else if (requestType === 'daily') {
      data = await Payment.find().select('bookingId paymentData.amount').populate('bookingId').sort({ createdAt: -1 });
    } else if (requestType === 'weekly') {
      const noOfWeek = !req.query.noOfWeek ? 5 : req.query.noOfWeek;
      const weeklyTime = noOfWeek * 7 * 24 * 60 * 60 * 1000
      weeklyStartDate = new Date(new Date().getTime() - weeklyTime);
      weeklyEndDate = new Date();
      const allPayments = await Payment.find({ createdAt: { $gte: weeklyStartDate, $lt: weeklyEndDate } });

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

      let weeklyTotals = {};

      allPayments.forEach(payment => {
        const paymentDate = new Date(payment.createdAt);
        const weekNumber = getWeekNumber(paymentDate);

        if (!weeklyTotals[weekNumber]) {
          weeklyTotals[weekNumber] = 0;
        }

        weeklyTotals[weekNumber] += payment.paymentData.amount;
      });
      data = weeklyTotals

    }
    else if (requestType === 'monthly') {
      const noOfMonth = !req.query.noOfMonth ? 12 : req.query.noOfMonth;
      const monthTime = noOfMonth * 30 * 7 * 24 * 60 * 60 * 1000;
      const monthEndDate = new Date();
      const monthStartDate = new Date(monthEndDate - monthTime);

      const allPayments = await Payment.find({ createdAt: { $gte: monthStartDate, $lt: monthEndDate } });

      const totalPaymentsByMonth = {};

      allPayments.forEach(payment => {
        const year = payment.createdAt.getFullYear();
        const month = payment.createdAt.getMonth() + 1;

        const key = `${month}-${year}`;
        if (!totalPaymentsByMonth[key]) {
          totalPaymentsByMonth[key] = 0;
        }

        totalPaymentsByMonth[key] += payment.paymentData.amount;
      });
      data = totalPaymentsByMonth
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


module.exports = { addPayment, allPayment };