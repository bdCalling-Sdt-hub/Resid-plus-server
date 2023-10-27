const response = require("../helpers/response");
const Payment = require("../models/Payment");
const Booking = require('../models/Booking')
const User = require("../models/User");
const kkiapay = require('kkiapay-nodejs-sdk')
const { addNotification, getAllNotification } = require('./notificationController')

const k = kkiapay({
  privatekey: process.env.KKIAPAY_PRKEY,
  publickey: process.env.KKIAPAY_PBKEY,
  secretkey: process.env.KKIAPAY_SCKEY,
  sandbox: true
})

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
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };

    //console.log("paymentTypes----------->", paymentTypes)
    if (paymentTypes !== 'half-payment' && paymentTypes !== 'full-payment') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Payment status not not appropiate' }));
    }
    const bookingDetails = await Booking.findById(bookingId).populate('residenceId');
    console.log("bookingDetails--------->", bookingDetails, bookingId)
    if (!bookingDetails) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking not found' }));
    };

    if (bookingDetails.status === 'cancelled') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking is cancelled' }));
    }

    if (bookingDetails.paymentTypes === 'full-payment') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Payment is already done' }));
    }

    if (checkUser.role === 'user' && bookingDetails.userId.toString() === req.body.userId) {
      k.verify(paymentData.transactionId).
        then(async (paymentResponse) => {
          console.log('payment info---------->', req.body)
          let amount = bookingDetails.totalAmount
          var paidAmount = paymentResponse.amount
          if ((paymentTypes === 'half-payment' && bookingDetails.paymentTypes === 'unknown') || (paymentTypes === 'full-payment' && bookingDetails.paymentTypes === 'half-payment')) {
            amount = Math.ceil(amount / 2)
          }
          if (paymentResponse === null) {
            return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Invalid payment data' }));
          }
          //enable it if running on production
          else if (paymentResponse?.state === 'Fake data' && process.env.NODE_ENV === 'production') {
            return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'Fake data is not allowed in production level' }));
          }

          else if (paidAmount !== amount) {
            return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'Invalid payment amount', data: { paidAmount, amount } }));
          }

          else if(bookingDetails.paymentTypes===paymentTypes){
            return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'Payment is already done', data: { paidAmount, amount } }));
          }

          else {
            const newPayment = new Payment({
              paymentData: paymentResponse,
              bookingId,
              userId: req.body.userId,
              hostId: bookingDetails.hostId,
              residenceId: bookingDetails.residenceId
            });

            await newPayment.save();
            bookingDetails.paymentTypes = paymentTypes;
            await bookingDetails.save();

            const message = checkUser.fullName + ' has completed ' + paymentTypes + ' for ' + bookingDetails.residenceId.residenceName
            const newNotification = {
              message: message,
              receiverId: bookingDetails.hostId,
              image: checkUser.image,
              linkId: bookingDetails._id,
              type: 'host'
            }
            await addNotification(newNotification)
            const notification = await getAllNotification('host', 10, 1, bookingDetails.hostId)
            io.to('room' + bookingDetails.hostId).emit('host-notification', notification);
            return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'payment', message: 'Payment added successfully.', data: newPayment }));
          }
        }).
        catch((error) => {
          console.log("error---------->", error)
          return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
        })
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to do payment now' }));
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

    const requestType = !req.query.requestType ? 'total' : req.query.requestType;
    var data
    if (requestType === 'total') {
      const allPayments = await Payment.find({ hostId: req.body.userId });
      const total = allPayments.reduce((total, payment) => total + payment.paymentData.amount, 0);
      data = total
      console.log("totalIncome---------->", total, allPayments, req.body.userId)
    }
    else if (requestType === 'daily') {
      const dayTime = 24 * 60 * 60 * 1000;
      const dayEndDate = new Date();
      const dayStartDate = new Date(dayEndDate - dayTime);
      const allPayments = await Payment.find({ createdAt: { $gte: dayStartDate, $lt: dayEndDate }, hostId: req.body.userId }).populate('bookingId residenceId');
      const total = allPayments.reduce((total, payment) => total + payment?.paymentData?.amount, 0);
      data = { allPayments, total }
    }
    else if (requestType === 'weekly') {
      const weeklyTime = 7 * 24 * 60 * 60 * 1000
      weeklyStartDate = new Date(new Date().getTime() - weeklyTime);
      weeklyEndDate = new Date();
      const allPayments = await Payment.find({ createdAt: { $gte: weeklyStartDate, $lt: weeklyEndDate }, hostId: req.body.userId }).populate('bookingId residenceId');
      const total = allPayments.reduce((total, payment) => total + payment?.paymentData?.amount, 0);
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

      const allPayments = await Payment.find({ createdAt: { $gte: monthStartDate, $lt: monthEndDate }, hostId: req.body.userId });

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const totalPaymentsByMonth = {};

      allPayments.forEach(payment => {
        const year = payment.createdAt.getFullYear();
        const month = payment.createdAt.getMonth();

        const key = `${monthNames[month]} ${year}`;
        if (!totalPaymentsByMonth[key]) {
          totalPaymentsByMonth[key] = 0;
        }

        totalPaymentsByMonth[key] += payment?.paymentData?.amount;
      });

      data = totalPaymentsByMonth;
    }

    else {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Request type not found' }));
    }

    return res.status(200).json({ data });
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
  console.log("refund hitted")
  // const id = req.params.id
  // const payment = await Payment.findById(id)

  // k.verify('pRQXUHZsh').
  //   then((response) => {
  //     return res.status(200).json(response)
  //   }).
  //   catch((error) => {
  //     return res.status(500).json(error)
  //   })


  // k.refund(""CFBlthP1Q").
  //   then((response) => {
  //     res.status(200).json(response)
  //   }).
  //   catch((error) => {
  //     res.status(500).json(error)
  //   })
  // k.refund("Fkz-oEiZS", { amount: 1000 }) // Specify the refund amount here
  //   .then((response) => {
  //     res.status(200).json(response);
  //   })
  //   .catch((error) => {
  //     res.status(500).json(error);
  //   });
  // console.log('hitting---------------->')
  k.setup_payout({
    algorithm: "roof",
    send_notification: true,
    destination_type: "MOBILE_MONEY",
    roof_amount: "5000",
    destination: "3456789098765"
  }).then((response) => {
    res.status(200).json(response)
  }).catch((error) => {
    res.status(500).json(error)
  })

}


module.exports = { addPayment, allPayment, refund };