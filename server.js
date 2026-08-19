const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const sheetCsvUrl = process.env.GOOGLE_SHEET_CSV_URL;

async function getGroupMembers() {
  if (!sheetCsvUrl) {
    console.error('Google Sheet CSV URL not set!');
    return [];
  }

  try {
    const response = await fetch(sheetCsvUrl);
    const csvText = await response.text();
    
    const rows = csvText.split('\n');
    const members = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i].trim();
      if (!row) continue;
      
      const cols = row.split(',');
      if (cols.length >= 2) {
        const name = cols[0].replace(/^["']|["']$/g, '').trim();
        let rawNumber = cols[1].replace(/^["']|["']$/g, '').trim().replace(/\D/g, ''); // Keep digits only
        
        if (rawNumber) {
          if (!rawNumber.startsWith('+')) {
            rawNumber = rawNumber.length === 10 ? '+1' + rawNumber : '+' + rawNumber;
          }
          members.push({ name, number: rawNumber });
        }
      }
    }
    return members;
  } catch (error) {
    console.error('Error fetching group members from Google Sheet:', error);
    return [];
  }
}

app.post('/webhook', async (req, res) => {
  try {
    const incomingMessage = req.body.Body;
    const senderNumber = req.body.From;

    const groupMembers = await getGroupMembers();

    const senderObj = groupMembers.find(m => m.number === senderNumber);
    const senderName = senderObj ? senderObj.name : senderNumber;

    console.log(`Received message from ${senderName} (${senderNumber}): ${incomingMessage}`);

    for (const member of groupMembers) {
      if (member.number !== senderNumber) {
        await client.messages.create({
          body: `${senderName}: ${incomingMessage}`,
          from: twilioNumber,
          to: member.number
        });
      }
    }

    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('Error handling incoming message:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/', (req, res) => {
  res.send('Eimek Group Chat Server with Google Sheets is running!');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
