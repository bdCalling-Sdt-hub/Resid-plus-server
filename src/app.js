const express = require('express')
const cors = require('cors');
const userRouter = require('./routes/userRouter');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();

// Connect to the MongoDB database
mongoose.connect(process.env.MONGODB_CONNECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(
  // {
  //   origin: [process.env.ALLOWED_CLIENT_URLS, process.env.ALLOWED_CLIENT_URLS_2],
  //   optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  // }
));

app.use('/api/users', userRouter);



app.get('/test', (req, res) => {
  res.send('I am responding!!')
})


module.exports = app;