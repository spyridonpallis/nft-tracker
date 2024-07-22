const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = 'https://api.opensea.io/api/v2';

console.log('Server starting...');
console.log('OpenSea API Key:', API_KEY ? 'Set' : 'Not set');

// Middleware to check if API key is set
const checkApiKey = (req, res, next) => {
  if (!API_KEY) {
    console.error('OpenSea API key is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  next();
};

// Helper function for OpenSea API requests
const openSeaRequest = async (endpoint) => {
  console.log(`Making OpenSea API request to: ${endpoint}`);
  try {
    const response = await axios.get(`${OPENSEA_BASE_URL}${endpoint}`, {
      headers: {
        'accept': 'application/json',
        'x-api-key': API_KEY
      }
    });
    console.log('OpenSea API response received');
    return response.data;
  } catch (error) {
    console.error('OpenSea API Error:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Test route
app.get('/api/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'API is working' });
});

// Route to get NFTs for an address
app.get('/api/nfts/:address', checkApiKey, async (req, res) => {
  console.log('NFT route hit:', req.params.address);
  try {
    const { address } = req.params;
    const data = await openSeaRequest(`/chain/ethereum/account/${address}/nfts`);
    console.log('NFT data fetched successfully');
    res.json(data);
  } catch (error) {
    console.error('Error in NFT route:', error);
    res.status(500).json({ error: 'An error occurred while fetching NFT data' });
  }
});

// Route to get collection stats
app.get('/api/collection-stats/:collection', checkApiKey, async (req, res) => {
  console.log('Collection stats route hit:', req.params.collection);
  try {
    const { collection } = req.params;
    const data = await openSeaRequest(`/collections/${collection}/stats`);
    console.log('Collection stats fetched successfully');
    res.json(data);
  } catch (error) {
    console.error('Error in collection stats route:', error);
    res.status(500).json({ error: 'An error occurred while fetching collection stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// For local testing
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

console.log('Routes set up. Ready to handle requests.');

module.exports = app;