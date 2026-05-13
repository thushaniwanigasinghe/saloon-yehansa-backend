require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@admin.com' });
    if (adminExists) {
      console.log('Admin already exists! You can log in with admin@admin.com and password admin123 (if you have not changed it).');
      process.exit();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await User.create({
      name: 'System Admin',
      email: 'admin@admin.com',
      password: hashedPassword,
      role: 'admin',
      phone: '0000000000'
    });

    console.log('Admin user created successfully! Email: admin@admin.com, Password: admin123');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
