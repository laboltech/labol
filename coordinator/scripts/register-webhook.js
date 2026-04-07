// Run this once to register the Helius webhook
// node scripts/register-webhook.js

require('dotenv').config();
const https = require('https');

const HELIUS_API_KEY    = process.env.HELIUS_API_KEY;
const COORDINATOR_URL   = process.env.COORDINATOR_URL || 'https://labol-production.up.railway.app';
const TOKEN_MINT        = process.env.TOKEN_MINT;
const BURN_ADDRESS      = process.env.BURN_ADDRESS || '1nc1nerator11111111111111111111111111111111';

if (!HELIUS_API_KEY) {
  console.error('HELIUS_API_KEY not set in .env');
  process.exit(1);
}

const payload = JSON.stringify({
  webhookURL:   `${COORDINATOR_URL}/v1/burn/webhook`,
  transactionTypes: ['TRANSFER'],
  accountAddresses: [BURN_ADDRESS],
  webhookType: 'enhanced',
});

const options = {
  hostname: 'api.helius.xyz',
  path:     `/v0/webhooks?api-key=${HELIUS_API_KEY}`,
  method:   'POST',
  headers:  {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('✓ Webhook registered:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\nAdd to .env:');
    console.log(`HELIUS_WEBHOOK_SECRET=${result.secret || 'check dashboard'}`);
  });
});

req.on('error', console.error);
req.write(payload);
req.end();
