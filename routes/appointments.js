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
    const { serviceId, date, time, notes } = req.body;

    // Fetch the service to get its duration
    const Service = require('../models/Service');
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found' });

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
      if (app.serviceId._id.toString() !== serviceId) return false;

      const existingStart = timeToMinutes(app.time);
      const existingEnd = existingStart + app.serviceId.duration;
      
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (overlap) {
      return res.status(400).json({ message: `This service is already booked from ${overlap.time} to ${new Date(0, 0, 0, 0, timeToMinutes(overlap.time) + overlap.serviceId.duration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}. Please select a later time.` });
    }

    const appointment = await Appointment.create({
      userId: req.user.id,
      serviceId,
      date,
      time,
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

      appointment.status = req.body.status || appointment.status;
      appointment.date = newDate;
      appointment.time = newTime;
      appointment.serviceId = newServiceId;
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
