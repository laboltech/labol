const express = require('express');
const router  = express.Router();
const { getOnlineMiners } = require('../relay/manager');

// GET /v1/stats
router.get('/stats', (req, res) => {
  const miners = getOnlineMiners();
  res.json({
    relay_miners_online: miners.length,
    tokens_burned:       0,    // TODO: pull from Supabase
    requests_served:     0,    // TODO: pull from Supabase
    network:             'solana',
    status:              miners.length > 0 ? 'online' : 'building',
  });
});

// GET /v1/leaderboard
router.get('/leaderboard', async (req, res) => {
  // TODO: query Supabase wallets ordered by earned_balance desc
  res.json({ leaderboard: [] });
});

module.exports = router;
