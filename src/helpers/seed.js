const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Category = require('../models/Category');
const Amenity = require('../models/Amenity');
const Country = require('../models/Country');

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
  }
];

const countriesData = [
  {
    "countryName": "SENEGAL",
    "countryCode":"+221"
  },
  {
    "countryName": "COTE D’IVOIRE",
    "countryCode":"+225"
  },
  {
    "countryName": "BURKINA FASO",
    "countryCode":"+226"
  },
  {
    "countryName": "BENIN",
    "countryCode":"+229"
  },
  {
    "countryName": "TOGO",
    "countryCode":"+228"
  },
  {
    "countryName": "MALI",
    "countryCode":"+223"
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
    console.log({message: 'Categories seeded successfully!', data: data});
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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_CONNECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Call seeding functions
const seedDatabase = async () => {
  try {
    await seedUsers();
    await seedAmenities();
    await seedCategories();
    await seedCountries();
    console.log('------------> Database seeding completed! <------------');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    mongoose.disconnect();
  }
};

// Execute seeding
seedDatabase();
