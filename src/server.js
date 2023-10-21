const app = require('./app');
require('dotenv').config();

const port = process.env.PORT || 3001;

app.listen(port, '192.168.10.18',() => {
  console.log(`Resid+ is listening on port: ${port}`)
});