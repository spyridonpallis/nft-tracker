const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = 'https://api.opensea.io/api/v2';

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
  try {
    const response = await axios.get(`${OPENSEA_BASE_URL}${endpoint}`, {
      headers: {
        'accept': 'application/json',
        'x-api-key': API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('OpenSea API Error:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Route to get NFTs for an address
app.get('/nfts/:address', checkApiKey, async (req, res) => {
  try {
    const { address } = req.params;
    const data = await openSeaRequest(`/chain/ethereum/account/${address}/nfts`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching NFT data' });
  }
});

// Route to get collection stats
app.get('/collection-stats/:collection', checkApiKey, async (req, res) => {
  try {
    const { collection } = req.params;
    const data = await openSeaRequest(`/collections/${collection}/stats`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching collection stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// For local testing
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;