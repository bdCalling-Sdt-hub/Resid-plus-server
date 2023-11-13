const axios = require('axios');
const logger = require('./logger');

// Function to send SMS
async function sendSMS(url,senderAddress, receiverAddress, message, accessToken) {
  try {
    console.log('Sending SMS...', url,senderAddress, receiverAddress, message, accessToken);
    const response = await axios.post(
      url,
      {
        outboundSMSMessageRequest: {
          address: receiverAddress,
          outboundSMSTextMessage: {
            message: message,
          },
          senderAddress: senderAddress,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`, // Replace with your access token
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 201) {
      console.log('SMS sent successfully');
      console.log(response); // Optional: Log the response data
    } else {
      console.error('Failed to send SMS:', response);
    }
  } catch (error) {
    logger.error(error, '-SMS sending error');
    console.error('Error sending SMS:', error);
  }
}

module.exports = sendSMS;
