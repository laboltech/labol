const express   = require('express');
const router    = express.Router();
const { requireAuth } = require('../middleware/auth');
const { generateChallenge, verifyArtifact } = require('../mining/challenge');
const { creditReward, getBalance } = require('../mining/rewards');

// In-memory challenge store (wallet → challenge)
// TODO: move to Redis for multi-instance
const pendingChallenges = new Map();

// GET /v1/challenge
// Returns a mining challenge. Requires auth.
router.get('/challenge', requireAuth, (req, res) => {
  const challenge = generateChallenge();
  pendingChallenges.set(req.wallet, challenge);

  // Never send _answer to client
  const { _answer, ...clientChallenge } = challenge;
  res.json(clientChallenge);
});

// POST /v1/submit
// Body: { challengeId, artifact }
router.post('/submit', requireAuth, async (req, res) => {
  const { challengeId, artifact } = req.body;
  if (!challengeId || !artifact)
    return res.status(400).json({ error: 'challengeId and artifact required' });

  const challenge = pendingChallenges.get(req.wallet);
  if (!challenge || challenge.id !== challengeId)
    return res.status(400).json({ error: 'challenge not found or expired' });

  pendingChallenges.delete(req.wallet);

  const correct = verifyArtifact(challenge, artifact);
  if (!correct) return res.json({ correct: false, reward: 0 });

  try {
    await creditReward(req.wallet);
    res.json({ correct: true, reward: 1000, message: 'Reward credited.' });
  } catch (err) {
    console.error('reward error:', err);
    res.status(500).json({ error: 'failed to credit reward' });
  }
});

// GET /v1/claims/status?wallet=...
router.get('/claims/status', async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    const balance = await getBalance(wallet);
    res.json(balance);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch balance' });
  }
});

module.exports = router;
