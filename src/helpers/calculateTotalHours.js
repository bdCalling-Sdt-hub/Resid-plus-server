function calculateTotalHoursBetween(startDateTimeStr, endDateTimeStr) {
  //format = 2023-09-26T18:00:00.000Z
  const startDateTime = new Date(startDateTimeStr);
  const endDateTime = new Date(endDateTimeStr);

  const timeDifference = endDateTime - startDateTime;
  const totalHours = parseFloat(timeDifference / (1000 * 3600));
  console.log('total hours-------->',timeDifference,totalHours)
  return totalHours;
}

module.exports = calculateTotalHoursBetween;