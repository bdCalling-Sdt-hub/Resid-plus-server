const app = require('./app');
require('dotenv').config();

const port = process.env.PORT || 3001;

app.listen(port, '103.161.9.109',() => {
  console.log(`Resid+ is listening on port ${port}`)
});