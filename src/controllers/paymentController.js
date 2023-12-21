const response = require("../helpers/response");
require("dotenv").config();
const crypto = require('crypto');
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

    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };

    const {
      bookingId,
      paymentTypes
    } = req.body;

    if (paymentTypes !== 'full-payment') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Payment status not not appropiate' }));
    }
    const bookingDetails = await Booking.findById(bookingId).populate('residenceId userId');
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
      const description = bookingDetails.userId.fullName + ' vouloir ' + paymentTypes + ' pour ' + bookingDetails.residenceId.residenceName + ' pour ' + bookingDetails.totalTime.days + ' jours et ' + bookingDetails.totalTime.hours + ' heures'

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
          "booking_id": bookingDetails._id.toString(),
          "user_id": bookingDetails.userId._id.toString(),
          "residence_id": bookingDetails.residenceId._id.toString(),
        },
        "actions": {
          "callback_url": `${process.env.API_DNS_NAME}/api/payments/payment-status`
        }
      }
      console.log("payload---------->", payload)
      const paydunyaResponse = await axios.post(payInTokenUrl, payload, { headers });
      if (paydunyaResponse.data.response_code === '00') {
        const newPayment = new Payment({
          bookingId,
          userId: req.body.userId,
          hostId: bookingDetails.hostId,
          residenceId: bookingDetails.residenceId._id,
          token: paydunyaResponse.data.token,
          status: 'pending',
          paymentTypes,
          paymentData: {
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
    const { paymentId } = req.body
    if (!paymentId) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Payment id not found') }));
    }
    const paymentDetails = await Payment.findById(paymentId).populate('bookingId residenceId userId');
    if (!paymentDetails) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('Payment not found') }));
    }
    if (paymentDetails.status === 'success') {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Payment is already done') }));
    }
    var payload;
    var payInURL;
    var account;
    if (paymentTypes === 'test' && process.env.NODE_ENV === 'development') {
      paymentDetails.status = 'success'
      paymentDetails.paymentMethod = paymentTypes
      await paymentDetails.save()
      const bookingDetails = await Booking.findById(paymentDetails.bookingId).populate('residenceId userId');
      bookingDetails.paymentTypes = paymentDetails.paymentTypes
      await bookingDetails.save()

      const hostMessage = paymentDetails.userId.fullName + " a payé " + paymentDetails.paymentData.residenceCharge + " pour " + paymentDetails.residenceId.residenceName + " pour l'ID de réservation : " + paymentDetails.bookingId.bookingId + ", après le départ, il sera transféré sur votre compte."

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
      io.to('room' + roomId).emit('host-notification', notification);

      return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'payment', message: 'Payment completed successfully.', data: paymentDetails }));
    }
    else if (paymentTypes === 'card') {
      const { cardNumber, cardCvv, cardExpiredDateYear, cardExpiredDateMonth, token, email, fullName } = req.body

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
      account = cardNumber
      console.log('card info------>', req.body)
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
    else if (paymentTypes === 'orange-money-senegal') {
      const { fullName, email, phoneNumber, otp, token } = req.body
      if (!fullName || !email || !phoneNumber || !otp || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Orange Money details not found') }));
      }
      account = phoneNumber
      payload = {
        "customer_name": fullName,
        "customer_email": email,
        "phone_number": phoneNumber,
        "authorization_code": otp,
        "invoice_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/orange-money-senegal'
    }
    else if (paymentTypes === 'free-money-senegal') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Orange Money details not found') }));
      }
      account = phoneNumber
      payload = {
        "customer_name": fullName,
        "customer_email": email,
        "phone_number": phoneNumber,
        "invoice_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/free-money-senegal'
    }
    else if (paymentTypes === 'expresso-senegal') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Orange Money details not found') }));
      }
      account = phoneNumber
      payload = {
        "expresso_sn_fullName": fullName,
        "expresso_sn_email": email,
        "expresso_sn_phone": phoneNumber,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/expresso-senegal'
    }
    else if (paymentTypes === 'wave-senegal') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Wave details not found') }));
      }
      console.log("wave-senegal---------->", req.body)
      account = phoneNumber
      payload = {
        "wave_senegal_fullName": fullName,
        "wave_senegal_email": email,
        "wave_senegal_phone": phoneNumber,
        "wave_senegal_payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/wave-senegal'
    }
    else if (paymentTypes === 'wizall-money-senegal') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Wave details not found') }));
      }
      console.log("wizall-money-senegal---------->", req.body)
      account = phoneNumber
      payload = {
        "customer_name": fullName,
        "customer_email": email,
        "phone_number": phoneNumber,
        "invoice_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/wizall-money-senegal'
    }
    else if (paymentTypes === 'orange-money-ci') {
      const { fullName, email, phoneNumber, otp, token } = req.body
      if (!fullName || !email || !phoneNumber || !otp || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Orange Money details not found') }));
      }
      account = phoneNumber
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
      account = phoneNumber
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
      console.log("moov-ci---------->", req.body)
      account = phoneNumber
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
      account = phoneNumber
      payload = {
        "wave_ci_fullName": fullName,
        "wave_ci_email": email,
        "wave_ci_phone": phoneNumber,
        "wave_ci_payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/wave-ci'
    }
    else if (paymentTypes === 'orange-money-burkina') {
      const { fullName, email, phoneNumber, otp, token } = req.body
      if (!fullName || !email || !phoneNumber || !otp || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Orange Money details not found') }));
      }
      account = phoneNumber
      payload = {
        "name_bf": fullName,
        "email_bf": email,
        "phone_bf": phoneNumber,
        "otp_code": otp,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/orange-money-burkina'
    }
    else if (paymentTypes === 'moov-burkina') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Moov details not found') }));
      }
      console.log("moov-burkina---------->", req.body)
      account = phoneNumber
      payload = {
        "moov_burkina_faso_fullName": fullName,
        "moov_burkina_faso_email": email,
        "moov_burkina_faso_phone_number": phoneNumber,
        "moov_burkina_faso_payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/moov-burkina'
    }
    else if (paymentTypes === 'moov-benin') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Moov details not found') }));
      }
      console.log("moov-benin---------->", req.body)
      account = phoneNumber
      payload = {
        "moov_benin_customer_fullname": fullName,
        "moov_benin_email": email,
        "moov_benin_phone_number": phoneNumber,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/moov-benin'
    }
    else if (paymentTypes === 'mtn-benin') {
      const { fullName, email, phoneNumber, provider, token } = req.body
      if (!fullName || !email || !phoneNumber || !provider || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required MTN details not found') }));
      }
      account = phoneNumber
      payload = {
        "mtn_benin_customer_fullname": fullName,
        "mtn_benin_email": email,
        "mtn_benin_phone_number": phoneNumber,
        "mtn_benin_wallet_provider": provider,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/mtn-benin'
    }
    else if (paymentTypes === 't-money-togo') {
      const { fullName, email, phoneNumber, token } = req.body
      if (!fullName || !email || !phoneNumber || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Moov details not found') }));
      }
      console.log("t-money-togo---------->", req.body)
      account = phoneNumber
      payload = {
        "name_t_money": fullName,
        "email_t_money": email,
        "phone_t_money": phoneNumber,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/t-money-togo'
    }
    else if (paymentTypes === 'moov-togo') {
      const { fullName, email, phoneNumber, token, address } = req.body
      if (!fullName || !email || !phoneNumber || !address || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Moov details not found') }));
      }
      console.log("moov-togo---------->", req.body)
      account = phoneNumber
      payload = {
        "moov_togo_customer_fullname": fullName,
        "moov_togo_email": email,
        "moov_togo_phone_number": phoneNumber,
        "moov_togo_customer_address": address,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/moov-togo'
    }
    else if (paymentTypes === 'orange-money-mali') {
      const { fullName, email, phoneNumber, address,otp, token } = req.body
      if (!fullName || !email || !phoneNumber || !address || !otp || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Orange Money details not found') }));
      }
      account = phoneNumber
      payload = {
        "orange_money_mali_customer_fullname": fullName,
        "orange_money_mali_email": email,
        "orange_money_mali_phone_number": phoneNumber,
        "orange_money_mali_customer_address":address,
        "orange_money_mali_wallet_otp": otp,
        "ipayment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/orange-money-mali'
    }
    else if (paymentTypes === 'moov-mali') {
      const { fullName, email, phoneNumber, address, token } = req.body
      if (!fullName || !email || !phoneNumber || !address || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Moov details not found') }));
      }
      console.log("moov-mali---------->", req.body)
      account = phoneNumber
      payload = {
        "moov_ml_customer_fullname": fullName,
        "moov_ml_email": email,
        "moov_ml_phone_number": phoneNumber,
        "moov_ml_customer_address": address,
        "payment_token": token
      }
      payInURL = 'https://app.paydunya.com/api/v1/softpay/moov-mali'
    }
    else if (paymentTypes === 'paydunya') {
      const { fullName, email, phoneNumber, password, token } = req.body
      if (!fullName || !email || !phoneNumber || !password || !token) {
        return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required Paydunya details not found') }));
      }
      console.log("paydunya---------->", req.body)
      account = phoneNumber
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
    console.log("paydunyaResponse---------->", paydunyaResponse.data)
    if (paydunyaResponse.data.success) {
      paymentDetails.paymentMethod = paymentTypes
      paymentDetails.accountNo = account
      await paymentDetails.save()
      return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'payment', message: 'Payment completed successfully, waiting for Paydunya confirmation', data: paydunyaResponse.data }));
    }
    else {
      console.log("paydunyaResponse---------->", paydunyaResponse.data)
      if (!paydunyaResponse.data.success) {
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

const paymentStatus = async (req, res) => {
  try {
    console.log("==========>>>>>>>> Payment Status ==========>>>>>>>>", req.body);
    logger.info({ "payment_status": req.body }, { "method": req.method, "url": req.originalUrl });
    const { data } = req.body
    const token = data?.invoice?.token
    const bookingId = data?.custom_data?.booking_id
    const userId = data?.custom_data?.user_id
    const residenceId = data?.custom_data?.residence_id
    const paymentStatus = data?.status
    const mode = data?.mode

    console.log("token---------->", token, bookingId, userId, residenceId, paymentStatus, mode, req.body?.data)

    // if (!token || !bookingId || !userId || !residenceId) {
    //   return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Required data not found') }));
    // }
    const paymentDetails = await Payment.findOne({ token: token });
    if (!paymentDetails) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Payment details not found') }));
    }
    console.log("paymentDetails---------->", paymentDetails)
    const bookingDetails = await Booking.findById(bookingId).populate('residenceId userId');
    if (paymentStatus === 'completed' && mode === 'live') {
      paymentDetails.status = 'success'
      paymentDetails.paymentData.receipt_url = data?.receipt_url
      const paymentUpdated = await paymentDetails.save()
      console.log("paymentUpdated---------->", paymentUpdated)

      bookingDetails.paymentTypes = paymentDetails.paymentTypes
      await bookingDetails.save()
      return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'payment', message: 'Payment status successfully got' }));
    }
    return res.status(201).json(response({ status: 'Error', statusCode: '400', type: 'payment', message: 'Payment status can not change' }));

    //   const hostMessage = paymentDetails.userId.fullName + " a payé " + paymentDetails.paymentData.residenceCharge + " pour " + paymentDetails.residenceId.residenceName + " pour l'ID de réservation : " + paymentDetails.bookingId.bookingId + ", après l'enregistrement, il sera transféré sur votre compte"

    //   const newNotification = {
    //     message: hostMessage,
    //     receiverId: paymentDetails.userId._id,
    //     image: paymentDetails.userId.image,
    //     linkId: paymentDetails.bookingId._id,
    //     role: 'host',
    //     type: 'booking'
    //   }

    //   const notification = await addNotification(newNotification)
    //   const roomId = paymentDetails.hostId._id.toString()
    //   io.to('room' + roomId).emit('host-notification', notification);

    //   const userMessage = "Le paiement est réussi pour " + bookingDetails.residenceId.residenceName
    //   io.to('room' + userId).emit('payment-notification', { status: "Successful", message: userMessage });

    // }
    // else {
    //   const userMessage = "Quelque chose s'est mal passé, réessayez avec les informations appropriées"
    //   io.to('room' + userId).emit('payment-notification', { status: "Failed", message: userMessage });
    //   logger.error({ "message": "Payment data not found or already paid", "token": data.invoice.token, "payment info": data }, "Payment status error")
    //   return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Payment data not found' }));
    // }
  }
  catch (error) {
    io.to('room' + req.body?.data?.custom_data?.user_id).emit('payment-notification', { status: "Failed", message: error.message });
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

const payoutDisburseAmount = async (disburseInvoice, userId) => {
  try {
    if (!disburseInvoice || !userId) {
      return 'Required data not found'
    }
    const payload = { "disburse_invoice": disburseInvoice, "disburse_id": userId }
    const response = await axios.post(payoutDisburseAmountUrl, payload, { headers });

    return response.data;
  }
  catch (error) {
    console.error(error);
    return error.message
  }
}

const takePayment = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    console.log("Body---------->", req.body)
    if (!checkUser || checkUser.status !== 'accepted') {
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
    if (!hostIncome) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Income not found') }));
    }
    if (amount < 200 && hostIncome.pendingAmount < amount) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Amount should be greater than 200 and less than you pending amount') }));
    }
    const disburse_token = await createDisburseToken({ account_alias, amount, withdraw_mode });
    console.log("disburse_token---------->", disburse_token)
    if (!disburse_token) {
      console.log("Error disburse token not created---------->")
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Disburse token not created') }));
    }
    const payload = { "disburse_invoice": disburse_token, "disburse_id": req.body.userId }
    const payoutResponce = await axios.post(payoutDisburseAmountUrl, payload, { headers });
    console.log("payoutDisburseAmount---------->", payoutResponce.data)
    if (payoutResponce?.data?.response_code === '00') {
      hostIncome.pendingAmount = hostIncome.pendingAmount - amount;
      await hostIncome.save();
      return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'payment', message: req.t('Payment is successfully withdwwn from wallet'), data: disburse_token }));
    }
    else {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', message: req.t('Payment withdraw failed') }));
    }
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: error.message }));
  }
}
//All payments
const allPayment = async (req, res) => {
  try {
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    }

    const requestType = !req.query.requestType ? 'total' : req.query.requestType;
    var data
    if (requestType === 'total') {
      const allPayments = await Payment.find({ hostId: req.body.userId, status: "success" });
      const total = allPayments.reduce((total, payment) => total + payment.paymentData.residenceCharge, 0);
      data = total
      console.log("totalIncome---------->", total, allPayments, req.body.userId)
    }
    else if (requestType === 'daily') {
      const dayTime = 24 * 60 * 60 * 1000;
      const dayEndDate = new Date();
      const dayStartDate = new Date(dayEndDate - dayTime);
      const allPayments = await Payment.find({ createdAt: { $gte: dayStartDate, $lt: dayEndDate }, hostId: req.body.userId, status: "success" }).populate('bookingId residenceId');
      const total = allPayments.reduce((total, payment) => total + payment?.paymentData?.residenceCharge, 0);
      data = { allPayments, total }
    }
    else if (requestType === 'weekly') {
      const weeklyTime = 7 * 24 * 60 * 60 * 1000
      weeklyStartDate = new Date(new Date().getTime() - weeklyTime);
      weeklyEndDate = new Date();
      const allPayments = await Payment.find({ createdAt: { $gte: weeklyStartDate, $lt: weeklyEndDate }, hostId: req.body.userId, status: "success" }).populate('bookingId residenceId');
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

      const allPayments = await Payment.find({ createdAt: { $gte: monthStartDate, $lt: monthEndDate }, hostId: req.body.userId, status: "success" });

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


module.exports = { allPayment, createPayInToken, payInAmount, createDisburseToken, payoutDisburseAmount, takePayment, paymentStatus };