const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Category = require('../models/Category');
const Amenity = require('../models/Amenity');

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
  }
];

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
    "key": "hotel",
    "translation": {
      "en": "Hotel",
      "fr": "Chambre"
    }
  },
  {
    "key": "residence",
    "translation": {
      "en": "Residence",
      "fr": "Résidence"
    }
  },
  {
    "key": "personal-house",
    "translation": {
      "en": "Personal-House",
      "fr": "Maison-personnelle"
    }
  }
]

// Function to seed users
const seedUsers = async () => {
  try {
    //await User.deleteMany();
    await User.insertMany(usersData);
    console.log('Users seeded successfully!');
  } catch (err) {
    console.error('Error seeding users:', err);
  }
};

// Function to seed amenities
const seedAmenities = async () => {
  try {
    //await Amenity.deleteMany();
    await Amenity.insertMany(amenitiesData);
    console.log('Amenities seeded successfully!');
  } catch (err) {
    console.error('Error seeding amenities:', err);
  }
};

// Function to seed categories
const seedCategories = async () => {
  try {
    //await Category.deleteMany();
    await Category.insertMany(categoriesData);
    console.log('Categories seeded successfully!');
  } catch (err) {
    console.error('Error seeding categories:', err);
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
    console.log('------------> Database seeding completed! <------------');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    mongoose.disconnect();
  }
};

// Execute seeding
seedDatabase();
