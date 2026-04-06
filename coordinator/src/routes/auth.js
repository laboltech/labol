const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const nacl    = require('tweetnacl');
const bs58    = require('bs58');

const nonces = new Map(); // wallet → nonce (in-memory, fine for MVP)

// POST /v1/auth/nonce
// Body: { wallet: "0x..." }
router.post('/nonce', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const nonce = `labol-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  nonces.set(wallet, { nonce, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min TTL

  res.json({ nonce, message: `Sign this message to authenticate with Labol:\n\n${nonce}` });
});

// POST /v1/auth/verify
// Body: { wallet, message, signature }
router.post('/verify', (req, res) => {
  const { wallet, message, signature } = req.body;
  if (!wallet || !message || !signature)
    return res.status(400).json({ error: 'wallet, message, signature required' });

  const stored = nonces.get(wallet);
  if (!stored || Date.now() > stored.expiresAt)
    return res.status(401).json({ error: 'nonce expired or not found' });

  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = bs58.decode(signature);
    const pubBytes = bs58.decode(wallet);

    const valid = nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes);
    if (!valid) return res.status(401).json({ error: 'invalid signature' });

    nonces.delete(wallet);

    const token = jwt.sign({ wallet }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, wallet });
  } catch (err) {
    res.status(401).json({ error: 'signature verification failed' });
  }
});

module.exports = router;
