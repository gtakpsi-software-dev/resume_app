const path = require('path');
const axios = require('axios');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Generate embeddings for a given text or array of texts using Voyage AI
 * @param {string|string[]} input - The text or array of texts to embed
 * @param {string} model - The Voyage AI model to use (default: voyage-3)
 * @returns {Promise<number[][]>} - Array of embeddings
 */
const generateEmbeddings = async (input, model = process.env.VOYAGE_MODEL || 'voyage-3') => {
    const apiKey = process.env.VOYAGE_API_KEY;

    if (!apiKey) {
        console.warn('VOYAGE_API_KEY not found in environment variables. Vector features will be limited.');
        return null;
    }

    try {
        const response = await axios.post(
            'https://api.voyageai.com/v1/embeddings',
            {
                input,
                model
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        if (response.data && response.data.data) {
            // Return just the embedding vectors
            return response.data.data.map(item => item.embedding);
        }

        throw new Error('Invalid response from Voyage AI API');
    } catch (error) {
        console.error('Error generating embeddings with Voyage AI:', error.message);
        if (error.response) {
            console.error('Voyage API Error Status:', error.response.status);
            console.error('Voyage API Error Data:', JSON.stringify(error.response.data));
        }
        throw error;
    }
};

module.exports = { generateEmbeddings };
