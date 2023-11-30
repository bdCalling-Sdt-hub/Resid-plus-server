const response = require("../helpers/response");
require("dotenv").config();
const Payment = require("../models/Payment");
const Booking = require('../models/Booking')
const User = require("../models/User");
const axios = require('axios')
const { addNotification, getAllNotification } = require('./notificationController');
const logger = require("../helpers/logger");
const Income = require("../models/Income");

var payInTokenUrl;
if (process.env.NODE_ENV === 'production') {
  payInTokenUrl = 'https://app.paydunya.com/api/v1/checkout-invoice/create'
}
else if (process.env.NODE_ENV === 'development') {
  payInTokenUrl = 'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create'
}

//only accesible in production mode
const payoutdisburseTokenUrl = 'https://app.paydunya.com/api/v1/disburse/get-invoice'
const payoutDisburseAmountUrl = 'https://app.paydunya.com/api/v1/disburse/submit-invoice'

const privateKey = process.env.NODE_ENV === 'production' ? process.env.PAYDUNYA_PRIVATE_KEY : process.env.PAYDUNYA_PRIVATE_TEST_KEY
const token = process.env.NODE_ENV === 'production' ? process.env.PAYDUNYA_TOKEN : process.env.PAYDUNYA_TEST_TOKEN

const headers = {
  'Content-Type': 'application/json',
  'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
  'PAYDUNYA-PRIVATE-KEY': privateKey,
  'PAYDUNYA-TOKEN': token,
}

const createPayInToken = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);

    if (!checkUser || checkUser.status!=='accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };

    const {
      bookingId,
      paymentTypes
    } = req.body;

    if (paymentTypes !== 'half-payment' && paymentTypes !== 'full-payment') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Payment status not not appropiate' }));
    }
    const bookingDetails = await Booking.findById(bookingId).populate('residenceId userId');
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

    if (checkUser.role === 'user' && bookingDetails.userId._id.toString() === req.body.userId) {
      let paymentAmount = bookingDetails.totalAmount
      if ((bookingDetails.paymentTypes === 'unknown' && paymentTypes === 'half-payment' || bookingDetails.paymentTypes === 'half-payment' && paymentTypes === 'full-payment')) {
        paymentAmount = Math.ceil(paymentAmount / 2)
      }
      const description = bookingDetails.userId.fullName + ' wants to ' + paymentTypes + ' for ' + bookingDetails.residenceId.residenceName + ' for ' + bookingDetails.totalTime.days + ' days and ' + bookingDetails.totalTime.hours + ' hours'

      const payload =
      {
        "invoice": {
          "total_amount": paymentAmount,
          "description": description,
        },
        "store": {
          "name": bookingDetails.userId.fullName,
          "postal_address": bookingDetails.userId.address,
          "phone": bookingDetails.userId.phoneNumber,
        },
        "custom_data": {
          "residence_name": bookingDetails.residenceId.residenceName,
          "booking_id": bookingDetails.bookingId,
          "total_time": bookingDetails.totalTime
        }
      }
      const paydunyaResponse = await axios.post(payInTokenUrl, payload, { headers });
      if (paydunyaResponse.data.response_code === '00') {
        const newPayment = new Payment({
          bookingId,
          userId: req.body.userId,
          hostId: bookingDetails.hostId,
          residenceId: bookingDetails.residenceId._id,
          status: 'pending',
          paymentTypes,
          paymentData: {
            token: paydunyaResponse.data.token,
            amount: paymentAmount,
            residenceCharge: bookingDetails.residenceCharge
          }
        });
        await newPayment.save();
        return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'payment', message: 'Payment token created successfully.', data: newPayment }));
      }
      else {
        logger.error(response.data, req.originalUrl)
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: paydunyaResponse.data }));
      }
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are not authorized to do payment now' }));
    }

  } catch (error) {
    logger.error(error)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
  }
}

const payInAmount = async (req, res) => {
  console.log("payInAmount---------->", req.body, req.query.paymentTypes)
  try {
    const paymentTypes = req.query.paymentTypes
    const {paymentId} = req.body
    if (!paymentId ) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Payment id not found') }));
    }
    const paymentDetails = await Payment.findById(paymentId).populate('bookingId residenceId userId');
    if(!paymentDetails){
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Payment not found') }));
    }
    if(paymentDetails.status === 'success'){
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Payment is already done') }));
    }
    var payload;
    var payInURL;
    if (paymentTypes === 'test' && process.env.NODE_ENV === 'development') {
      paymentDetails.status = 'success'
      paymentDetails.paymentMethod = paymentTypes
      await paymentDetails.save()
      const bookingDetails = await Booking.findById(paymentDetails.bookingId).populate('residenceId userId');
      bookingDetails.paymentTypes = paymentDetails.paymentTypes
      await bookingDetails.save()

      const hostMessage = paymentDetails.userId.fullName + " a payé " + paymentDetails.paymentData.residenceCharge +" pour " + paymentDetails.residenceId.residenceName + " pour l'ID de réservation : " + paymentDetails.bookingId.bookingId + ", après le départ, il sera transféré sur votre compte."

      const newNotification = {
        message: hostMessage,
        receiverId: paymentDetails.userId._id,
        image: paymentDetails.userId.image,
        linkId: paymentDetails.bookingId._id,
        role: 'host',
        type: 'booking'
      }

      const notification = await addNotification(newNotification)
      const roomId = paymentDetails.hostId._id.toString()
      io.to('room'+roomId).emit('host-notification', notification);
        
      return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'payment', message: 'Payment completed successfully.', data: paymentDetails }));
    }
    else if (paymentTypes === 'card') {
      const { cardNumber, cardCvv, cardExpiredDateYear, cardExpiredDateMonth, token, email, fullName } = req.body
      console.log(req.body)
      if (!cardNumber || !cardCvv || !cardExpiredDateYear || !cardExpiredDateMonth || !token || !email || !fullName) {
        if (!cardNumber) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Card number is required' }));
        }
        
        if (!cardCvv) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'CVV is required' }));
        }
        
        if (!cardExpiredDateYear) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Card expiration year is required' }));
        }
        
        if (!cardExpiredDateMonth) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Card expiration month is required' }));
        }
        
        if (!token) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Token is required' }));
        }
        
        if (!email) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Email is required' }));
        }
        
        if (!fullName) {
          return res.status(400).json(response({ status: 'Error', statusCode: '400', message: 'Full name is required' }));
        }
        
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Card details not found') }));
      }
      payload = {
        "full_name": fullName,
        "email": email,
        "card_number": cardNumber,
        "card_cvv": cardCvv,
        "card_expired_date_year": cardExpiredDateYear,
        "card_expired_date_month": cardExpiredDateMonth,
        "token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/card'
    }
    else if (paymentTypes === 'orange-money-ci') {
      const { fullName, email, phoneNumber, otp, token } = req.body
      if (!fullName || !email || !phoneNumber || !otp || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Orange Money details not found') }));
      }
      payload = {
        "orange_money_ci_customer_fullname": fullName,
        "orange_money_ci_email": email,
        "orange_money_ci_phone_number": phoneNumber,
        "orange_money_ci_otp": otp,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/orange-money-ci'
    }
    else if (paymentTypes === 'mtn-ci') {
      const { fullName, email, phoneNumber, provider, token } = req.body
      if (!fullName || !email || !phoneNumber || !provider || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required MTN details not found') }));
      }
      payload = {
        "mtn_ci_customer_fullname": fullName,
        "mtn_ci_email": email,
        "mtn_ci_phone_number": phoneNumber,
        "mtn_ci_wallet_provider": provider,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/mtn-ci'
    }
    else if (paymentTypes === 'moov-ci') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Moov details not found') }));
      }
      payload = {
        "moov_ci_customer_fullname": fullName,
        "moov_ci_email": email,
        "moov_ci_phone_number": phoneNumber,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/moov-ci'
    }
    else if (paymentTypes === 'wave-ci') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Wave details not found') }));
      }
      console.log("wave-ci---------->", req.body)
      payload = {
        "wave_ci_fullName": fullName,
        "wave_ci_email": email,
        "wave_ci_phone": phoneNumber,
        "wave_ci_payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/wave-ci'
    }
    else if (paymentTypes === 'paydunya') {
      const { fullName, email, phoneNumber, password, token } = req.body
      if (!fullName || !email || !phoneNumber || !password || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Paydunya details not found') }));
      }
      payload = {
        "customer_name": fullName,
        "customer_email": email,
        "phone_phone": phoneNumber,
        "password": password,
        "invoice_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/paydunya'
    }
    else {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Payment type not found') }));
    }
    console.log("payload---------->", payload, payInURL)
    const paydunyaResponse = await axios.post(payInURL, payload);
    if (paydunyaResponse.data.success) {
      paymentDetails.status = 'success'
      paymentDetails.paymentMethod = paymentTypes
      await paymentDetails.save()
      const bookingDetails = await Booking.findById(paymentDetails.bookingId).populate('residenceId userId');
      bookingDetails.paymentTypes = paymentDetails.paymentTypes
      await bookingDetails.save()

      const hostMessage = paymentDetails.userId.fullName + ' a payé ' + paymentDetails.paymentData.residenceCharge +' pour ' + paymentDetails.residenceId.residenceName + " pour l'ID de réservation: " + paymentDetails.bookingId.bookingId + ", après le départ, il sera transféré sur votre compte."

      const newNotification = {
        message: hostMessage,
        receiverId: paymentDetails.userId._id,
        image: paymentDetails.userId.image,
        linkId: paymentDetails.bookingId._id,
        role: 'host',
        type: 'booking'
      }

      const notification = await addNotification(newNotification)
      const roomId = paymentDetails.hostId._id.toString()
      io.to('room'+roomId).emit('host-notification', notification);

      return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'payment', message: 'Payment completed successfully.', data: paydunyaResponse.data }));
    }
    else {
      console.log("paydunyaResponse---------->", paydunyaResponse.data)
      if(!paydunyaResponse.data.success){
        paymentDetails.status = 'failed'
        await paymentDetails.save()
      }
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: paydunyaResponse.data }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
  }
}

const createDisburseToken = async (data) => {
  try {
    const payload =
    {
      account_alias: data?.account_alias,
      amount: data?.amount,
      withdraw_mode: data?.withdraw_mode
    }
    const response = await axios.post(payoutdisburseTokenUrl, payload, { headers });
    if (response?.data?.response_code === '00') {
      return response.data.disburse_token;
    }
    else {
      return null;
    }

  } catch (error) {
    logger.error(error, 'Disburse token creation error')
    console.error(error);
    return res.status;
  }
}

const payoutDisburseAmount = async (data) => {
  try {
    if (!data.disburse_invoice) {
      return 'Disburse invoice not found'
    }
    const payload = { "disburse_invoice": data.disburse_invoice, "disburse_id": data?.bookingId }
    const response = await axios.post(payoutDisburseAmountUrl, payload, { headers });
    if (response?.data?.response_code === '00') {
      return true;
    }
    else {
      return false;
    }
  }
  catch (error) {
    console.error(error);
    return error.message
  }
}

const takePayment = async (req, res) => {
  const checkUser = await User.findById(req.body.userId);
  if(!checkUser || checkUser.status!=='accepted'){
    return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
  }
  const {
    account_alias,
    amount,
    withdraw_mode,
  } = req.body;

  if (!account_alias || !amount || !withdraw_mode) {
    return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required fields not found') }));
  }

  const hostIncome = await Income.findOne({ hostId: req.body.userId });
  if(!hostIncome){
    return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Income not found') }));
  }
  if(amount<200 && hostIncome.pendingAmount<amount){
    return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Amount should be greater than 200 and less than you pending amount') }));
  }
  const disburse_token = await createDisburseToken({ account_alias, amount, withdraw_mode });
  if (!disburse_token) {
    return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Disburse token not created') }));
  }
  const userId = req.body.userId;
  const payout = await payoutDisburseAmount({disburse_token, userId});
  if(!payout){
    return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Disburse amount not completed') }));
  }
  hostIncome.pendingAmount = hostIncome.pendingAmount - amount;
  await hostIncome.save();
  return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'payment', message: req.t('Payment token created successfully.') }));
}
//All payments
const allPayment = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser || checkUser.status!=='accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    }

    const requestType = !req.query.requestType ? 'total' : req.query.requestType;
    var data
    if (requestType === 'total') {
      const allPayments = await Payment.find({ hostId: req.body.userId, status:"success" });
      const total = allPayments.reduce((total, payment) => total + payment.paymentData.residenceCharge, 0);
      data = total
      console.log("totalIncome---------->", total, allPayments, req.body.userId)
    }
    else if (requestType === 'daily') {
      const dayTime = 24 * 60 * 60 * 1000;
      const dayEndDate = new Date();
      const dayStartDate = new Date(dayEndDate - dayTime);
      const allPayments = await Payment.find({ createdAt: { $gte: dayStartDate, $lt: dayEndDate }, hostId: req.body.userId, status:"success" }).populate('bookingId residenceId');
      const total = allPayments.reduce((total, payment) => total + payment?.paymentData?.residenceCharge, 0);
      data = { allPayments, total }
    }
    else if (requestType === 'weekly') {
      const weeklyTime = 7 * 24 * 60 * 60 * 1000
      weeklyStartDate = new Date(new Date().getTime() - weeklyTime);
      weeklyEndDate = new Date();
      const allPayments = await Payment.find({ createdAt: { $gte: weeklyStartDate, $lt: weeklyEndDate }, hostId: req.body.userId, status:"success" }).populate('bookingId residenceId');
      const total = allPayments.reduce((total, payment) => total + payment?.paymentData?.residenceCharge, 0);
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

      const allPayments = await Payment.find({ createdAt: { $gte: monthStartDate, $lt: monthEndDate }, hostId: req.body.userId, status:"success" });

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

        totalPaymentsByMonth[key] += payment?.paymentData?.residenceCharge;
      });

      data = totalPaymentsByMonth;
    }

    else {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Request type not found') }));
    }

    return res.status(200).json({ data });
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting payments'),
      })
    );
  }
};


module.exports = { allPayment, createPayInToken, payInAmount, createDisburseToken, payoutDisburseAmount, takePayment };