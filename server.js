const express = require('express');
const { Telnyx } = require('telnyx');
const app = express();

app.use(express.json());

// Automatically loads your API key from Render's Environment Variables
const telnyx = new Telnyx(process.env.TELNYX_API_KEY); 

// Replace with your purchased Telnyx phone number later
const telnyxNumber = '+1YOUR_TELNYX_NUMBER';

// Paste your 50 group members' phone numbers here
const groupMembers = [
  '+15551112222', 
  '+15553334444',
  // Add all numbers here
];

app.post('/webhook', async (req, res) => {
  const event = req.body.data;

  if (event && event.event_type === 'message.received') {
    const incomingSender = event.payload.from.phone_number;
    const messageBody = event.payload.text;
    
    const outgoingText = `${incomingSender}: ${messageBody}`;

    for (let member of groupMembers) {
      if (member !== incomingSender) {
        try {
          await telnyx.messages.create({
            from: telnyxNumber,
            to: member,
            text: outgoingText,
          });
        } catch (error) {
          console.error(`Failed to send to ${member}:`, error);
        }
      }
    }
  }

  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server is running on port ' + port);
});
