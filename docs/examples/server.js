const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();

// server.js
//
// Use this sample code to handle webhook events in your expressjs server.
//
// 1) Paste this code into a new file (server.js)
//
// 2) Install dependencies
//   npm install jsonwebtoken
//   npm install express
//
// 3) Run the server on http://localhost:3000
//   node server.js

// Wix public key used to verify webhook signatures. Set WIX_PUBLIC_KEY
// in your environment for production deployments.
const PUBLIC_KEY = process.env.WIX_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp1t69dN5qbUAS00eazDF
MiI1Ek4Ehp78OyZxOkrFCmo8HQYJ1G9ZJOtKNF/zL+TTyAdlbNfvlBpcKVfLDc9U
ZWLnBb1HIVrXDTR68nn/xi9NNLZF6xd5M10sGqDgrLM/6STZlpBA4yafcjet3BPS
HvGQo36RHMxgvmVTkZo/TysaUAlvV4kzuezHvpw7alKQl/TwctVNTpCIVlpBjJN2
2qrhdGPk8kFwdgn1n9XwskzWP+fTiy542NGo/0d1fYOZSFSlwybh7ygi9BtFHfmt
oYciq9XsE/4PlRsA7kdl1aXlL6ZpwW3pti2HurEXGxiBlir9OTwkXR3do/KbTi02
ewIDAQAB
-----END PUBLIC KEY-----`;

app.post('/webhook', express.text(), (request, response) => {
  let event;
  let eventData;

  try {
    const { data: raw } = jwt.verify(request.body, PUBLIC_KEY);
    event = JSON.parse(raw);
    eventData = JSON.parse(event.data);
  } catch (err) {
    console.error(err);
    response.status(400).send(`Webhook error: ${err.message}`);
    return;
  }

  switch (event.eventType) {
    case "wix.bookings.v2.booking_confirmed":
      console.log(`wix.bookings.v2.booking_confirmed event received with data:", eventData);
      console.log(`App instance ID:", event.instanceId);
      //
      // handle your event here
      //
      break;
    default:
      console.log(`Received unknown event type: ${event.eventType}`);
      break;
  }

  response.status(200).send();
});

app.listen(3000, () => console.log("Server started on port 3000"));
