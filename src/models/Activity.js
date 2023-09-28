const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    operatingSystem: { type: String, required: false },
    deviceModel: { type: String, required: false },
    userId: { type: String, required: false },
    browser: { type: String, required: false },
},
    { timestamps: true },

);

module.exports = mongoose.model('Activity', activitySchema);