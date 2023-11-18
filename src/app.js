const express = require('express')
const cors = require('cors');
const userRouter = require('./routes/userRouter');
const residenceRouter = require('./routes/residenceRouter');
const bookingRouter = require('./routes/bookingRouter');
const favouriteRouter = require('./routes/favouriteRouter');
const termsAndConditionRouter = require('./routes/termsAndConditionRouter')
const privacyPolicyRouter = require('./routes/privacyPolicyRouter')
const aboutUsRouter = require('./routes/aboutUsRouter')
const reviewRouter = require('./routes/reviewRouter')
const notificationRouter = require('./routes/notificationRouter')
const activityRouter = require('./routes/activityRouter')
const supportRouter = require('./routes/supportRouter')
const faqRouter = require('./routes/faqRouter')
const paymentRouter = require('./routes/paymentRouter')
const amenitiesRouter = require('./routes/amenitiesRouter')
const categoryRouter = require('./routes/categoryRouter')
const promoCodeRouter = require('./routes/promoCodeRouter')
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
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
  {
    origin: [process.env.ALLOWED_CLIENT_URL_DASHBOARD, process.env.ALLOWED_CLIENT_URL_WEB],
    optionsSuccessStatus: 200
  }
));

//configuring i18next
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const Backend = require('i18next-node-fs-backend');

i18next
.use(Backend)
.use(i18nextMiddleware.LanguageDetector)
.init({
  backend: {
    loadPath: __dirname + '/translation/{{lng}}/translation.json',
  },
  detection: {
    order: ['header'],
    caches: ['cookie']
  },
  preload: ['en', 'fr'],
  fallbackLng: process.env.API_RESPONCE_LANGUAGE,
});
app.use(i18nextMiddleware.handle(i18next));

//initilizing logger
// const logger = require('./helpers/logger');
// app.use((req, res, next) => {
//   logger.info(`Method: ${req.method}, Request URL: ${req.url}`);
//   next();
// });

//initilizing API routes
app.use('/api/users', userRouter);
app.use('/api/residences', residenceRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/favourites', favouriteRouter)
app.use('/api/terms-and-conditions', termsAndConditionRouter)
app.use('/api/privacy-policys', privacyPolicyRouter)
app.use('/api/about-us', aboutUsRouter)
app.use('/api/reviews', reviewRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/activities', activityRouter)
app.use('/api/supports', supportRouter)
app.use('/api/faqs', faqRouter)
app.use('/api/payments', paymentRouter)
app.use('/api/amenities', amenitiesRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/promo-codes', promoCodeRouter)

//testing API is alive
app.get('/test', (req, res) => {
  res.send(req.t('Back-end is responding!!'))
})

//invalid route handler
app.use(notFoundHandler);
//error handling
app.use(errorHandler);
module.exports = app;