const axios = require('axios');
const logger = require('./logger');

async function getAccessToken(authorizationHeader) {
  try {
    const requestBody = new URLSearchParams();
    requestBody.append('grant_type', 'client_credentials');

    const config = {
      headers: {
        Authorization: authorizationHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const response = await axios.post('https://api.orange.com/oauth/v3/token', requestBody, config);

    if (response.status === 200) {
      const accessToken = response.data.access_token;
      return accessToken;
    } else {
      logger.error(response, '-SMS sending error');
      console.error('Failed to fetch access token:', response.status, response.data);
      return null;
    }
  } catch (error) {
    logger.error(error, '-SMS sending error');
    console.error('Error fetching access token:', error.message);
    return null;
  }
}

// Function to send SMS
async function sendSMS(url,senderAddress, receiverAddress, message, basicToken) {
  try {
    console.log('Sending SMS...', url,senderAddress, receiverAddress, message, accessToken);
    const accessToken = await getAccessToken(basicToken);
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
          'authorization': `Bearer ${accessToken}`, // Replace with your access token
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 201) {
      console.log('SMS sent successfully');
    } else {
      logger.error(response, '-SMS sending error');
      console.error('Failed to send SMS:', response);
    }
  } catch (error) {
    logger.error(error, '-SMS sending error');
  }
}

module.exports = sendSMS;
