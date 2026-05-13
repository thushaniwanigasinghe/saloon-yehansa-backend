require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Service = require('../models/Service');

const seedServices = [
  {
    name: 'Bridal Package',
    description: 'Complete bridal hair styling, premium makeup, and trial session prior to the big day.',
    price: 35000,
    duration: 180,
    category: 'Packages'
  },
  {
    name: 'Ultimate Pamper Package',
    description: 'Full body massage, revitalizing facial, and luxury manicure & pedicure.',
    price: 20000,
    duration: 150,
    category: 'Packages'
  },
  {
    name: 'Keratin Smoothing Treatment',
    description: 'A hair-smoothing, frizz-controlling treatment that leaves hair sleek and shiny for months.',
    price: 15000,
    duration: 120,
    category: 'Treatments'
  },
  {
    name: 'Deep Tissue Massage',
    description: 'Intensive massage treatment focusing on deep layers of muscle tissue to relieve chronic pain.',
    price: 9000,
    duration: 60,
    category: 'Treatments'
  },
  {
    name: 'Balayage & Styling',
    description: 'Custom hand-painted highlights tailored to your hair for a natural, sun-kissed look.',
    price: 18000,
    duration: 150,
    category: 'Hair Care'
  },
  {
    name: 'Classic Haircut',
    description: 'Consultation, wash, tailored haircut, and professional blowout.',
    price: 6000,
    duration: 45,
    category: 'Hair Care'
  },
  {
    name: 'Designer Sari Rental',
    description: 'Rent our premium, hand-crafted designer saris for weddings and special occasions. Price per day.',
    price: 12000,
    duration: 1440,
    category: 'Attire Rentals'
  },
  {
    name: 'Party Frock Rental',
    description: 'Elegant party frocks and evening gowns available for rent. Dry cleaning included. Price per day.',
    price: 8000,
    duration: 1440,
    category: 'Attire Rentals'
  },
  {
    name: 'Bridal Lehenga Rental',
    description: 'Stunning traditional bridal lehengas available for your big day. Alterations included. Price per day.',
    price: 25000,
    duration: 1440,
    category: 'Attire Rentals'
  },
  {
    name: 'Classic Gel Manicure',
    description: 'Full nail shaping, cuticle care, and long-lasting gel polish application.',
    price: 4500,
    duration: 60,
    category: 'Nail Care'
  },
  {
    name: 'Luxury Spa Pedicure',
    description: 'Relaxing foot soak, exfoliation, massage, and expert nail polishing.',
    price: 5500,
    duration: 60,
    category: 'Nail Care'
  },
  {
    name: 'Evening Party Makeup',
    description: 'Flawless makeup application tailored for evening events, including false lashes.',
    price: 8500,
    duration: 60,
    category: 'Makeup'
  },
  {
    name: 'Signature Glowing Facial',
    description: 'Deep cleansing, exfoliation, and hydration to restore your skin\'s natural radiance.',
    price: 11000,
    duration: 60,
    category: 'Spa & Wellness'
  },
  {
    name: 'Full Body Scrub',
    description: 'Exfoliating sea salt scrub followed by rich body butter application for silky smooth skin.',
    price: 9500,
    duration: 60,
    category: 'Spa & Wellness'
  },
  {
    name: 'Hair Straightening',
    description: 'Professional hair straightening treatment for a sleek and smooth finish.',
    price: 15000,
    duration: 120,
    category: 'Hair Care'
  },
  {
    name: 'Hair Removal',
    description: 'Gentle and effective hair removal services tailored to your skin type.',
    price: 3000,
    duration: 45,
    category: 'Spa & Wellness'
  },
  {
    name: 'Curly Hair Styling',
    description: 'Specialized cutting and styling for enhancing your natural curls.',
    price: 4500,
    duration: 60,
    category: 'Hair Care'
  },
  {
    name: 'Normal Makeup',
    description: 'Soft, natural makeup application perfect for daytime events or casual gatherings.',
    price: 4000,
    duration: 45,
    category: 'Makeup'
  },
  {
    name: 'Heavy Makeup',
    description: 'Glamorous, long-lasting heavy makeup with intricate detailing for special events.',
    price: 9000,
    duration: 90,
    category: 'Makeup'
  },
  {
    name: 'Face Pack',
    description: 'Rejuvenating face pack treatment to instantly brighten and hydrate your skin.',
    price: 2500,
    duration: 30,
    category: 'Spa & Wellness'
  },
  {
    name: 'Face Treatment',
    description: 'Advanced facial treatments targeting specific skin concerns like acne, aging, or pigmentation.',
    price: 8000,
    duration: 60,
    category: 'Spa & Wellness'
  },
  {
    name: 'Hair Rebonding',
    description: 'Permanent hair rebonding process to transform curly or wavy hair into silky straight locks.',
    price: 20000,
    duration: 180,
    category: 'Hair Care'
  }
];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await Service.deleteMany({});
    await Service.insertMany(seedServices);
    console.log('Services seeded successfully!');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
