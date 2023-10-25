const app = require('./app');
require('dotenv').config();

const port = process.env.PORT || 3001;

app.listen(port, '165.22.118.95',() => {
  console.log(`Resid+ is listening on port: ${port}`)
});