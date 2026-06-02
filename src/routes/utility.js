const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');

// Reverse Geocoding: Lat/Lng -> Address Name
router.get('/reverse-geocode', utilityController.reverseGeocode);

// Geocoding: Query Address -> Lat/Lng
router.get('/geocode', utilityController.geocode);

module.exports = router;
