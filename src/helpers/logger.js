const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../../app.log');

function logMessage(level, message, errorPath) {
  const logEntry = `${new Date().toISOString()} [${level}] ${
    typeof message === 'object' ? JSON.stringify(message) : message
  }${errorPath ? ` (Error Path: ${typeof errorPath === 'object' ? JSON.stringify(errorPath) : errorPath})` : ''}\n`;

  try {
    const existingLogs = fs.readFileSync(logFilePath, 'utf8');
    fs.writeFileSync(logFilePath, logEntry + existingLogs);
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
}

module.exports = {
  info: (message, errorPath) => logMessage('INFO', message, errorPath), // Include errorPath here
  error: (message, errorPath) => logMessage('ERROR', message, errorPath),
};
