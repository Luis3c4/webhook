// Import Express.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();
// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const accessToken = process.env.ACCESS_TOKEN;

// Route for GET requests
if (!verifyToken) {
  console.error('Error: VERIFY_TOKEN is not set in the environment variables.');
  process.exit(1);
}

if (!accessToken) {
  console.error('Error: ACCESS_TOKEN is not set in the environment variables.');
  process.exit(1);
}

// Function to send WhatsApp message
async function sendWhatsAppMessage(phoneNumberId, recipientPhone, message) {
  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  
  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    throw error;
  }
}
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  
  try {
    // Extract message data from webhook
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    
    if (message && message.type === 'text') {
      const phoneNumberId = value.metadata.phone_number_id;
      const fromPhone = message.from;
      const messageBody = message.text.body;
      
      console.log(`\nReceived message from ${fromPhone}: ${messageBody}`);
      
      // Send a reply
      const replyMessage = `Hola! Recibí tu mensaje: "${messageBody}"`;
      await sendWhatsAppMessage(phoneNumberId, fromPhone, replyMessage);
    }
    
    res.status(200).end();
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(200).end(); // Still return 200 to WhatsApp
  }
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});