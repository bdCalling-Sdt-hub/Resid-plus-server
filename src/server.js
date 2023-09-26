const app = require('./app');
require('dotenv').config();

const port = process.env.PORT || 3001;

<<<<<<< HEAD
app.listen(port, '103.161.9.43',() => {
=======
app.listen(port, '192.168.10.18',() => {
>>>>>>> 892caac5b7a8b004420bcef27a0a154c44b5e38a
  console.log(`Resid+ is listening on port ${port}`)
});