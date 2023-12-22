const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Category = require('../models/Category');
const Amenity = require('../models/Amenity');
const Country = require('../models/Country');
const PaymentGateway = require('../models/PaymentGateway');

// Sample data
const usersData = [
  {
    "fullName": "Brou Franck",
    "email": "ad.residplus@gmail.com",
    "phoneNumber": "+2250757063629",
    "address": "Canada",
    "dateOfBirth": new Date("2000-01-01"),
    "password": "helloadmin",
    "role": "super-admin",
    "emailVerified": true
  },
  {
    "fullName": "Franck Brou",
    "email": "sub.residplus@gmail.com",
    "phoneNumber": "+2250757063629",
    "address": "Canada",
    "dateOfBirth": new Date("2000-01-01"),
    "password": "hellosubadmin",
    "role": "admin",
    "emailVerified": true
  },
  {
    "fullName": "Testing Host",
    "email": "host@gmail.com",
    "phoneNumber": "+2250757063629",
    "address": "Canada",
    "dateOfBirth": new Date("2000-01-01"),
    "password": "hellohost",
    "role": "host",
    "emailVerified": true,
    "country": "6569d157077a08fb0acc03c0"
  },
  {
    "fullName": "Testing User",
    "email": "user@gmail.com",
    "phoneNumber": "+2250757063629",
    "address": "Canada",
    "dateOfBirth": new Date("2000-01-01"),
    "password": "hellouser",
    "role": "user",
    "emailVerified": true,
    "country": "6569d157077a08fb0acc03c0"
  }
];

const countriesData = [
  {
    "_id": "6569d157077a08fb0acc03bf",
    "countryName": "SENEGAL",
    "countryCode": "+221",
    "countryFlag": {
      publicFileUrl: `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/flags/senegal.png`,
      path: 'public\\uploads\\flags\\senegal.png'
    }
  },
  {
    "_id": "6569d157077a08fb0acc03c0",
    "countryName": "COTE D'IVOIRE",
    "countryCode": "+225",
    "countryFlag": {
      publicFileUrl: `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/flags/ivory-coast.png`,
      path: 'public\\uploads\\flags\\ivory-coast.png'
    }
  },
  {
    "_id": "6569d157077a08fb0acc03c1",
    "countryName": "BURKINA FASO",
    "countryCode": "+226",
    "countryFlag": {
      publicFileUrl: `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/flags/burkina-faso.png`,
      path: 'public\\uploads\\flags\\burkina-faso.png'
    }
  },
  {
    "_id": "6569d157077a08fb0acc03c2",
    "countryName": "BENIN",
    "countryCode": "+229",
    "countryFlag": {
      publicFileUrl: `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/flags/benin.png`,
      path: 'public\\uploads\\flags\\benin.png'
    }
  },
  {
    "_id": "6569d157077a08fb0acc03c3",
    "countryName": "TOGO",
    "countryCode": "+228",
    "countryFlag": {
      publicFileUrl: `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/flags/togo.png`,
      path: 'public\\uploads\\flags\\togo.png'
    }
  },
  {
    "_id": "6569d157077a08fb0acc03c4",
    "countryName": "MALI",
    "countryCode": "+223",
    "countryFlag": {
      publicFileUrl: `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/flags/mali.png`,
      path: 'public\\uploads\\flags\\mali.png'
    }
  }
]

const amenitiesData = [
  {
    "key": "wifi",
    "translation": {
      "en": "WiFi",
      "fr": "WiFi"
    }
  },
  {
    "key": "bathtub",
    "translation": {
      "en": "Bathtub",
      "fr": "Baignoire"
    }
  },
  {
    "key": "iron",
    "translation": {
      "en": "Iron",
      "fr": "Fer à Repasser"
    }
  },
  {
    "key": "game-console",
    "translation": {
      "en": "Game Console",
      "fr": "Console de Jeu"
    }
  },
  {
    "key": "fans",
    "translation": {
      "en": "Fans",
      "fr": "Ventilateurs"
    }
  },
  {
    "key": "refrigerator",
    "translation": {
      "en": "Refrigerator",
      "fr": "Réfrigérateur"
    }
  },
  {
    "key": "swimming-pool",
    "translation": {
      "en": "Swimming Pool",
      "fr": "Piscine"
    }
  },
  {
    "key": "hot-water",
    "translation": {
      "en": "Hot Water",
      "fr": "Eau Chaude"
    }
  },
  {
    "key": "wardrobe",
    "translation": {
      "en": "Wardrobe",
      "fr": "Garde-Robe"
    }
  },
  {
    "key": "tv",
    "translation": {
      "en": "TV",
      "fr": "Télévision"
    }
  },
  {
    "key": "air-conditioner",
    "translation": {
      "en": "Air Conditioner",
      "fr": "Climatiseur"
    }
  },
  {
    "key": "kitchen",
    "translation": {
      "en": "Kitchen",
      "fr": "Cuisine"
    }
  },
  {
    "key": "microwave",
    "translation": {
      "en": "Microwave",
      "fr": "Four à Micro-Ondes"
    }
  },
  {
    "key": "spa",
    "translation": {
      "en": "SPA",
      "fr": "SPA"
    }
  }
]

const categoriesData = [
  {
    "_id": "656184a880b6b1c2ef30998a",
    "key": "hotel",
    "translation": {
      "en": "Hotel",
      "fr": "Hôtel"
    }
  },
  {
    "_id": "656184a880b6b1c2ef30998b",
    "key": "residence",
    "translation": {
      "en": "Residence",
      "fr": "Résidence"
    }
  },
  {
    "_id": "656184a880b6b1c2ef30998c",
    "key": "personal-house",
    "translation": {
      "en": "Personal-House",
      "fr": "Maison-personnelle"
    }
  }
];

const paymentGatewaysData = [
  {
      "country":"6569d157077a08fb0acc03c4",
      "paymentGateways": [
          {
              "method": "MOOV",
              "paymentTypes": "moov-mali",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/MOOV.png`,
          },
          {
              "method": "ORANGE",
              "paymentTypes": "orange-money-mali",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/Orange.png`,
          }
      ]
  },
  {
      "country":"6569d157077a08fb0acc03c3",
      "paymentGateways": [
          {
              "method": "MOOV",
              "paymentTypes": "moov-togo",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/MOOV.png`,
          },
          {
              "method": "T-MONEY",
              "paymentTypes": "t-money-togo",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/TMoney.png`,
          }
      ]
  },
  {
      "country":"6569d157077a08fb0acc03c2",
      "paymentGateways": [
          {
              "method": "MOOV",
              "paymentTypes": "moov-benin",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/MOOV.png`,
          },
          {
              "method": "MTN",
              "paymentTypes": "mtn-benin",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/MTN.png`,
          }
      ]
  },
  {
      "country":"6569d157077a08fb0acc03c1",
      "paymentGateways": [
          {
              "method": "ORANGE",
              "paymentTypes": "orange-money-burkina",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/Orange.png`,
          },
          {
              "method": "MOOV",
              "paymentTypes": "moov-burkina",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/MOOV.png`,
          }
      ]
  },
  {
      "country":"6569d157077a08fb0acc03c0",
      "paymentGateways": [
          {
              "method": "ORANGE",
              "paymentTypes": "orange-money-ci",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/Orange.png`,
          },
          {
              "method": "MTN",
              "paymentTypes": "mtn-ci",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/MTN.png`,
          },
          {
              "method": "MOOV",
              "paymentTypes": "moov-ci",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/MOOV.png`,
          },
          {
              "method": "WAVE",
              "paymentTypes": "wave-ci",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/Wave.png`,
          }
      ]
  },
  {
      "country":"6569d157077a08fb0acc03bf",
      "paymentGateways": [
          {
              "method": "ORANGE",
              "paymentTypes": "orange-money-senegal",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/Orange.png`,
          },
          {
              "method": "FREE-MONEY",
              "paymentTypes": "free-money-senegal",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/FreeMoney.png`,
          },
          {
              "method": "EXPRESSO",
              "paymentTypes": "expresso-senegal",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/Expresso.png`,
          },
          {
              "method": "WIZALL",
              "paymentTypes": "wizall-money-senegal",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/Wizall.png`,
          },
          {
              "method": "WAVE",
              "paymentTypes": "wave-senegal",
              "publicFileUrl": `${process.env.IMAGE_UPLOAD_BACKEND_DOMAIN}/uploads/paymentGateways/Wave.png`,
          }
      ]
  }
]

// Function to drop the entire database
const dropDatabase = async () => {
  try {
    await mongoose.connection.dropDatabase();
    console.log('------------> Database dropped successfully! <------------');
  } catch (err) {
    console.error('Error dropping database:', err);
  }
};

// Function to seed users
const seedUsers = async () => {
  try {
    await User.deleteMany();
    await User.insertMany(usersData);
    console.log('Users seeded successfully!');
  } catch (err) {
    console.error('Error seeding users:', err);
  }
};

// Function to seed amenities
const seedAmenities = async () => {
  try {
    await Amenity.deleteMany();
    await Amenity.insertMany(amenitiesData);
    console.log('Amenities seeded successfully!');
  } catch (err) {
    console.error('Error seeding amenities:', err);
  }
};

// Function to seed categories
const seedCategories = async () => {
  try {
    await Category.deleteMany();
    const data = await Category.insertMany(categoriesData);
    console.log({ message: 'Categories seeded successfully!', data: data });
  } catch (err) {
    console.error('Error seeding categories:', err);
  }
};

// Function to seed countries
const seedCountries = async () => {
  try {
    await Country.deleteMany();
    await Country.insertMany(countriesData);
    console.log('Countries seeded successfully!');
  } catch (err) {
    console.error('Error seeding countries:', err);
  }
};

const seedPaymentGateways = async () => {
  try {
    await PaymentGateway.deleteMany();
    await PaymentGateway.insertMany(paymentGatewaysData);
    console.log('Payment Gateways seeded successfully!');
  } catch (err) {
    console.error('Error seeding payment gateways:', err);
  }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_CONNECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Call seeding functions
const seedDatabase = async () => {
  try {
    await dropDatabase(); 
    await seedAmenities();
    await seedCategories();
    await seedCountries();
    await seedUsers();
    await seedPaymentGateways();
    console.log('------------> Database seeding completed! <------------');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    mongoose.disconnect();
  }
};

// Execute seeding
seedDatabase();
