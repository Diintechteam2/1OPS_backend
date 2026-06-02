const https = require('https');

// Helper to make https GET requests
const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response from Google Maps API'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Reverse Geocode: Lat/Lng -> Address string
 * Returns Nominatim compatible JSON: { display_name: "address" }
 */
exports.reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key is missing. Using fallback.');
      return res.json({ display_name: `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}` });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const data = await fetchJson(url);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const address = data.results[0].formatted_address;
      return res.json({ display_name: address });
    } else {
      console.warn('Google Maps Geocoding failed with status:', data.status);
      return res.json({ display_name: `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}` });
    }
  } catch (error) {
    console.error('Error in reverseGeocode controller:', error.message);
    // Graceful fallback to avoid breaking frontend
    const fallbackLat = req.query.lat ? parseFloat(req.query.lat).toFixed(6) : '0';
    const fallbackLng = req.query.lng ? parseFloat(req.query.lng).toFixed(6) : '0';
    return res.json({ display_name: `${fallbackLat}, ${fallbackLng}` });
  }
};

/**
 * Geocode: Address string -> Lat/Lng coordinates
 * Returns Nominatim compatible JSON array: [{ lat: "lat", lon: "lng" }]
 */
exports.geocode = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'q (address/query) parameter is required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key is missing for geocoding.');
      return res.json([]);
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${apiKey}`;
    const data = await fetchJson(url);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      // Return list structure matching Nominatim format
      return res.json([{
        lat: String(location.lat),
        lon: String(location.lng)
      }]);
    } else {
      console.warn('Google Maps Geocoding search failed with status:', data.status);
      return res.json([]);
    }
  } catch (error) {
    console.error('Error in geocode search controller:', error.message);
    return res.json([]);
  }
};
