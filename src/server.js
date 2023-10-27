const app = require('./app');
require('dotenv').config();

const port = process.env.PORT || 3001;

app.listen(port, '138.68.184.31',() => {
  console.log(`Resid+ is listening on port: ${port}`)
});