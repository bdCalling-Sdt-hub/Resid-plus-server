const axios = require('axios');
const logger = require('./logger');
require('dotenv').config()

async function sendSMS(url,senderAddress, receiverAddress, message, basicToken) {
  try {
    const tokenResponse = await axios.post(
      "https://api.orange.com/oauth/v3/token",
      {
        grant_type: "client_credentials",
      },
      {
        headers: {
          Authorization: "Basic "+basicToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const token = tokenResponse.data.access_token;
    const smsResponse = await axios.post(
      url,
      {
        "outboundSMSMessageRequest": {
          "address": `tel:${receiverAddress}`,
          "senderAddress": `tel:${senderAddress}`,
          "outboundSMSTextMessage": {
            "message": `${message}`,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    return smsResponse.data;
  } catch (error) {
    console.error(error);
  }
};

module.exports = sendSMS;
