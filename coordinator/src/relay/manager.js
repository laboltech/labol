const { WebSocketServer } = require('ws');

// Active relay miners: wallet → { ws, model, provider, quality, connectedAt }
const relayMiners = new Map();

// Pending compute requests: requestId → { resolve, reject, timeout }
const pendingRequests = new Map();

function initRelay(server) {
  const wss = new WebSocketServer({ server, path: '/relay/connect' });

  wss.on('connection', (ws, req) => {
    let minerWallet = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);

        if (msg.type === 'register') {
          // Miner registers: { type, wallet, model, provider }
          minerWallet = msg.wallet;
          relayMiners.set(minerWallet, {
            ws,
            model:       msg.model    || 'unknown',
            provider:    msg.provider || 'unknown',
            quality:     1.0,
            connectedAt: Date.now(),
          });
          console.log(`⚡ Relay miner connected: ${minerWallet} (${msg.model})`);
          ws.send(JSON.stringify({ type: 'registered', status: 'ok' }));
        }

        if (msg.type === 'response') {
          // Miner sends back inference response
          const pending = pendingRequests.get(msg.requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.delete(msg.requestId);
            pending.resolve(msg.response);
          }
        }

        if (msg.type === 'error') {
          const pending = pendingRequests.get(msg.requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.delete(msg.requestId);
            pending.reject(new Error(msg.error || 'relay error'));
          }
        }

      } catch (err) {
        console.error('relay parse error:', err);
      }
    });

    ws.on('close', () => {
      if (minerWallet) {
        relayMiners.delete(minerWallet);
        console.log(`Relay miner disconnected: ${minerWallet}`);
      }
    });
  });

  console.log('⚡ Relay WebSocket ready at /relay/connect');
}

// Pick best available relay miner
function getBestMiner() {
  let best = null;
  for (const [wallet, miner] of relayMiners) {
    if (miner.ws.readyState !== 1) continue; // only OPEN connections
    if (!best || miner.quality > best.quality) {
      best = { wallet, ...miner };
    }
  }
  return best;
}

// Route a prompt to a relay miner, returns a Promise
function routeRequest(requestId, prompt, model, maxTokens = 512) {
  return new Promise((resolve, reject) => {
    const miner = getBestMiner();
    if (!miner) return reject(new Error('no_relay_miners_online'));

    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('relay_timeout'));
    }, 30000); // 30s timeout

    pendingRequests.set(requestId, { resolve, reject, timeout });

    miner.ws.send(JSON.stringify({
      type:      'request',
      requestId,
      prompt,
      model:     model || miner.model,
      maxTokens,
    }));
  });
}

function getOnlineMiners() {
  const miners = [];
  for (const [wallet, m] of relayMiners) {
    if (m.ws.readyState === 1) {
      miners.push({ wallet, model: m.model, provider: m.provider, quality: m.quality });
    }
  }
  return miners;
}

module.exports = { initRelay, routeRequest, getOnlineMiners };
