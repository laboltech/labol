const WebSocket = require('ws');
const axios     = require('axios');

function startRelay({ wallet, aiKey, aiUrl, model, coordinator }) {
  console.log(`\n⚡ Labol Tech Relay Miner`);
  console.log(`   Wallet:      ${wallet}`);
  console.log(`   Model:       ${model}`);
  console.log(`   Coordinator: ${coordinator}\n`);

  let ws;
  let reconnectDelay = 3000;

  function connect() {
    ws = new WebSocket(`${coordinator}/relay/connect`);

    ws.on('open', () => {
      console.log('✓ Connected to coordinator');
      reconnectDelay = 3000;

      // Register as relay miner
      ws.send(JSON.stringify({
        type:     'register',
        wallet,
        model,
        provider: new URL(aiUrl).hostname,
      }));
    });

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'registered') {
        console.log('✓ Registered as relay miner — waiting for requests...');
      }

      if (msg.type === 'request') {
        const { requestId, prompt, maxTokens } = msg;
        console.log(`→ Request ${requestId.slice(0, 8)}...`);

        try {
          const result = await callAI({ aiUrl, aiKey, model, prompt, maxTokens });
          ws.send(JSON.stringify({ type: 'response', requestId, response: result }));
          console.log(`✓ Served ${requestId.slice(0, 8)}`);
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', requestId, error: err.message }));
          console.error(`✗ Error on ${requestId.slice(0, 8)}:`, err.message);
        }
      }
    });

    ws.on('close', () => {
      console.log(`Disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  }

  connect();
}

async function callAI({ aiUrl, aiKey, model, prompt, maxTokens }) {
  const response = await axios.post(
    `${aiUrl}/chat/completions`,
    {
      model,
      messages:   [{ role: 'user', content: prompt }],
      max_tokens: maxTokens || 512,
    },
    {
      headers: {
        'Authorization': `Bearer ${aiKey}`,
        'Content-Type':  'application/json',
      },
      timeout: 25000,
    }
  );
  return response.data.choices[0].message.content;
}

module.exports = { startRelay };
