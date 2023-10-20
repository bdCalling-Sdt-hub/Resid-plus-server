const app = require('./app');
require('dotenv').config();

const port = process.env.PORT || 3001;

app.listen(port, '134.209.188.175',() => {
  console.log(`Resid+ is listening on port: ${port}`)
});