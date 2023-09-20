function calculateTotalHoursBetween(startDateTimeStr, endDateTimeStr) {
  //format = 2023-09-18T14:30:00
  const startDateTime = new Date(startDateTimeStr);
  const endDateTime = new Date(endDateTimeStr);

  const timeDifference = endDateTime - startDateTime;
  const totalHours = parseFloat(timeDifference / (1000 * 3600));
  console.log(timeDifference,totalHours)
  return totalHours;
}

module.exports = calculateTotalHoursBetween;