const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { protect, admin } = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'noreply@aurasalon.com',
    pass: process.env.EMAIL_PASS || 'dummy-password'
  }
});

// Get all appointments (Admin)
router.get('/', protect, admin, async (req, res) => {
  try {
    const appointments = await Appointment.find({}).populate('userId', 'name email').populate('serviceId', 'name price');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's appointments
router.get('/myappointments', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user.id }).populate('serviceId', 'name price');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create appointment
router.post('/', protect, async (req, res) => {
  try {
    const { serviceId, date, endDate, time, notes } = req.body;

    // Fetch the service to get its duration and availability
    const Service = require('../models/Service');
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const isRental = service.category === 'Rentals' || service.name.toLowerCase().includes('rental');

    // Validate availability rules
    const [year, month, day] = date.split('-');
    const selectedDate = new Date(year, month - 1, day);
    const isCustom = service.availability?.isCustom;
    const daysOff = isCustom ? (service.availability?.daysOff || []) : [0];
    if (daysOff.includes(selectedDate.getDay()) && selectedDate.getDay() === 0) {
      return res.status(400).json({ message: 'Sunday bookings are currently closed. Please choose another day (for example, come on Monday instead).' });
    } else if (daysOff.includes(selectedDate.getDay())) {
      return res.status(400).json({ message: 'Service is not available on the selected day' });
    }

    if (!isRental && time) {
      const duration = service.duration; // in minutes

      // Helper to convert "HH:mm" to minutes from midnight
      const timeToMinutes = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const newStart = timeToMinutes(time);
      const newEnd = newStart + duration;

      // Fetch all existing appointments for this service and date (populate serviceId for duration)
      const existingAppointments = await Appointment.find({
        date,
        status: { $ne: 'cancelled' }
      }).populate('serviceId');

      // Check for overlaps with appointments that use the same staff (in this case, same serviceId)
      const overlap = existingAppointments.find(app => {
        if (!app.time || app.serviceId._id.toString() !== serviceId) return false;

        const existingStart = timeToMinutes(app.time);
        const existingEnd = existingStart + app.serviceId.duration;
        
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (overlap) {
        return res.status(400).json({ message: `This service is already booked from ${overlap.time} to ${new Date(0, 0, 0, 0, timeToMinutes(overlap.time) + overlap.serviceId.duration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}. Please select a later time.` });
      }
    }

    const appointment = await Appointment.create({
      userId: req.user.id,
      serviceId,
      date,
      endDate: isRental ? endDate : undefined,
      time: isRental ? undefined : time,
      notes
    });
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update appointment status (Admin/User can cancel)
router.put('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('userId', 'email name');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    let isApproving = false;

    // User can only cancel their own, Admin can do anything
    if (req.user.role === 'admin') {
      if (req.body.status === 'approved' && appointment.status !== 'approved') {
        isApproving = true;
      }

      // If date, time or service is being updated, check for conflicts
      const newDate = req.body.date || appointment.date;
      const newTime = req.body.time || appointment.time;
      const newServiceId = req.body.serviceId || appointment.serviceId;

      if (req.body.date || req.body.time || req.body.serviceId) {
        // Fetch target service for duration
        const Service = require('../models/Service');
        const targetService = await Service.findById(newServiceId);
        if (!targetService) return res.status(404).json({ message: 'Target service not found' });

        const timeToMinutes = (t) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };

        const newStart = timeToMinutes(newTime);
        const newEnd = newStart + targetService.duration;

        const existingAppointments = await Appointment.find({
          _id: { $ne: appointment._id },
          date: newDate,
          status: { $ne: 'cancelled' }
        }).populate('serviceId');

        const overlap = existingAppointments.find(app => {
          if (app.serviceId._id.toString() !== newServiceId.toString()) return false;
          const existingStart = timeToMinutes(app.time);
          const existingEnd = existingStart + app.serviceId.duration;
          return (newStart < existingEnd && newEnd > existingStart);
        });

        if (overlap) {
          return res.status(400).json({ message: `Conflict: This service is already booked from ${overlap.time} to ${new Date(0, 0, 0, 0, timeToMinutes(overlap.time) + overlap.serviceId.duration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}.` });
        }
      }

      const oldStatus = appointment.status;
      appointment.status = req.body.status || appointment.status;
      appointment.date = newDate;
      appointment.time = newTime;
      appointment.serviceId = newServiceId;

      if (req.body.status === 'completed' && oldStatus !== 'completed') {
        const User = require('../models/User');
        const Service = require('../models/Service');
        
        const client = await User.findById(appointment.userId._id || appointment.userId);
        const bookedService = await Service.findById(appointment.serviceId);

        if (client && bookedService) {
          client.loyaltyPoints = (client.loyaltyPoints || 0) + 25; // 25 points per service
          if (client.loyaltyPoints >= 200) client.loyaltyLevel = 'Gold';
          else if (client.loyaltyPoints >= 100) client.loyaltyLevel = 'Silver';
          else client.loyaltyLevel = 'Bronze';
          
          if (!client.badges) client.badges = [];
          if (!client.badges.includes('First Visit')) client.badges.push('First Visit');
          
          // Count completed appointments before this one
          const completedCount = await Appointment.countDocuments({ userId: client._id, status: 'completed' });
          const newTotal = completedCount + 1; // Including the one being completed right now

          let emailMessage = null;
          let emailSubject = null;

          // Milestone 1: 5 Services (20% Discount Reward)
          if (newTotal === 5 && !client.badges.includes('5 Services Champion')) {
            client.badges.push('5 Services Champion');
            client.badges.push('20% Discount Reward');
            client.systemNotifications.push({
              message: 'Congratulations! You unlocked a 20% Discount Reward for completing 5 services.',
              type: 'reward'
            });
            emailSubject = 'Congratulations! You earned a 20% Discount - Saloon Yehansa';
            emailMessage = `Hello ${client.name},\n\nYou have just completed your 5th service with us! As a reward, you have earned a 20% discount on your next visit.\n\nThank you,\nSaloon Yehansa`;
          }

          // Milestone 2: 10 Services (Free Hairstyle Reward)
          if (newTotal === 10 && !client.badges.includes('10 Services Elite')) {
            client.badges.push('10 Services Elite');
            client.badges.push('Free Hairstyle Reward');
            client.systemNotifications.push({
              message: 'Incredible! You unlocked a Free Hairstyle Reward for completing 10 services. You are an Elite member!',
              type: 'reward'
            });
            emailSubject = 'Incredible! You earned a Free Hairstyle - Saloon Yehansa';
            emailMessage = `Hello ${client.name},\n\nThank you for your incredible loyalty! You have completed 10 services with us. As an elite member, you have earned a FREE Hairstyle service on your next visit.\n\nThank you,\nSaloon Yehansa`;
          }

          // Special Bridal Package Promotion
          if (bookedService.name.toLowerCase().includes('bridal') && !client.badges.includes('Bridal Bonus')) {
            client.badges.push('Bridal Bonus');
            client.badges.push('Free Mother Service (Day 2)');
            client.systemNotifications.push({
              message: 'Bridal Bonus Unlocked! You have earned a FREE service for the mother of the bride on the second day.',
              type: 'reward'
            });
            
            // Only overwrite email if a milestone email isn't already being sent this time
            if (!emailSubject) { 
              emailSubject = 'Special Bridal Promotion Unlocked - Saloon Yehansa';
              emailMessage = `Hello ${client.name},\n\nCongratulations on your Bridal service! As part of our special Bridal Package, you have unlocked a FREE service for the mother of the bride on the second day. Please contact us to schedule it.\n\nThank you,\nSaloon Yehansa`;
            }
          }

          await client.save();

          // Send Milestone / Reward Email asynchronously
          if (emailMessage && client.email) {
            const mailOptions = {
              from: process.env.EMAIL_USER || 'noreply@aurasalon.com',
              to: client.email,
              subject: emailSubject,
              text: emailMessage
            };
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) console.error('Reward email failed:', error);
              else console.log('Reward email sent:', info.response);
            });
          }
        }
      }
    } else if (req.user.id === appointment.userId._id.toString() && req.body.status === 'cancelled') {
      appointment.status = 'cancelled';
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const updatedAppointment = await appointment.save();

    // Send automated email notification to client
    if (isApproving && appointment.userId?.email) {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@aurasalon.com',
        to: appointment.userId.email,
        subject: 'Your Booking has been Approved - Saloon Yehansa',
        text: `Hello ${appointment.userId.name},\n\nYour booking has been approved. Please arrive on your scheduled date (${new Date(appointment.date).toLocaleDateString()}) and time (${appointment.time}).\n\nThank you,\nSaloon Yehansa`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email notification failed to send:', error);
        } else {
          console.log('Approval email sent successfully:', info.response);
        }
      });
    }

    res.json(updatedAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
