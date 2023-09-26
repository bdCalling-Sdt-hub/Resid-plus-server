const express = require('express')
const cors = require('cors');
const userRouter = require('./routes/userRouter');
const residenceRouter = require('./routes/residenceRouter');
const bookingRouter = require('./routes/bookingRouter');
const favouriteRouter = require('./routes/favouriteRouter');
const paymentRouter = require('./routes/paymentRouter');
const termsAndConditionRouter = require('./routes/termsAndConditionRouter')
const privacyPolicyRouter = require('./routes/privacyPolicyRouter')
const aboutUsRouter = require('./routes/aboutUsRouter')
const reviewRouter = require('./routes/reviewRouter')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();

// Connect to the MongoDB database
mongoose.connect(process.env.MONGODB_CONNECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//making public folder static for publicly access
app.use(express.static('public'));

// For handling form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors(
  // {
  //   origin: [process.env.ALLOWED_CLIENT_URLS, process.env.ALLOWED_CLIENT_URLS_2],
  //   optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  // }
));

app.use('/api/users', userRouter);
app.use('/api/residence', residenceRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/payments', paymentRouter)
app.use('/api/favourites', favouriteRouter)
app.use('/api/terms-and-conditions', termsAndConditionRouter)
app.use('/api/privacy-policys', privacyPolicyRouter)
app.use('/api/about-us', aboutUsRouter)
app.use('/api/reviews', reviewRouter)


app.get('/test', (req, res) => {
  res.send('I am responding!!')
})


module.exports = app;