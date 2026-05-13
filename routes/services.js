const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all services (Public)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({});
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single service (Public)
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (service) res.json(service);
    else res.status(404).json({ message: 'Service not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a service (Admin Only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a service (Admin Only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (service) res.json(service);
    else res.status(404).json({ message: 'Service not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a service (Admin Only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (service) res.json({ message: 'Service removed' });
    else res.status(404).json({ message: 'Service not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new review
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const service = await Service.findById(req.params.id);
    const user = await User.findById(req.user.id);

    if (service && user) {
      const alreadyReviewed = service.reviews.find(
        (r) => r.user.toString() === user._id.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: 'Service already reviewed' });
      }

      const review = {
        name: user.name,
        rating: Number(rating),
        comment,
        user: user._id,
      };

      service.reviews.push(review);
      service.numReviews = service.reviews.length;
      service.rating =
        service.reviews.reduce((acc, item) => item.rating + acc, 0) /
        service.reviews.length;

      await service.save();
      res.status(201).json({ message: 'Review added' });
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a review (Admin Only)
router.delete('/:id/reviews/:reviewId', protect, admin, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (service) {
      service.reviews = service.reviews.filter(r => r._id.toString() !== req.params.reviewId.toString());
      service.numReviews = service.reviews.length;
      service.rating = service.reviews.length > 0
        ? service.reviews.reduce((acc, item) => item.rating + acc, 0) / service.reviews.length
        : 0;

      await service.save();
      res.json({ message: 'Review deleted successfully' });
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
