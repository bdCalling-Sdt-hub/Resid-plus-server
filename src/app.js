const express = require('express')
const cors = require('cors');

const app = express()
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(
  // {
  //   origin: [process.env.ALLOWED_CLIENT_URLS, process.env.ALLOWED_CLIENT_URLS_2],
  //   optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  // }
));

app.get('/test', (req, res) => {
  res.send('I am responding!!')
})


module.exports = app;