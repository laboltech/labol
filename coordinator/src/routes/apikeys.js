const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Generate lk_xxx API key
function generateApiKey() {
  return 'lk_' + crypto.randomBytes(24).toString('hex');
}

// POST /v1/apikeys/create
// Body: { wallet }
router.post('/create', async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const key = generateApiKey();

  const { error } = await supabase.from('compute_keys').insert({
    key,
    wallet,
    token_balance: 0,
    tokens_burned: 0,
  });

  if (error) return res.status(500).json({ error: 'failed to create key' });

  res.json({ key, wallet, token_balance: 0 });
});

// GET /v1/apikeys/list?wallet=...
router.get('/list', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const { data, error } = await supabase
    .from('compute_keys')
    .select('key, token_balance, tokens_burned, created_at')
    .eq('wallet', wallet)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'failed to fetch keys' });
  res.json({ keys: data || [] });
});

// POST /v1/apikeys/revoke
// Body: { key }
router.post('/revoke', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });

  const { error } = await supabase
    .from('compute_keys')
    .delete()
    .eq('key', key);

  if (error) return res.status(500).json({ error: 'failed to revoke key' });
  res.json({ ok: true, revoked: key });
});

// GET /v1/apikeys/balance?key=...
router.get('/balance', async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'key required' });

  const { data, error } = await supabase
    .from('compute_keys')
    .select('wallet, token_balance, tokens_burned')
    .eq('key', key)
    .single();

  if (error && error.code === 'PGRST116')
    return res.status(404).json({ error: 'key not found' });
  if (error) return res.status(500).json({ error: 'failed to fetch balance' });

  res.json({ key, ...data });
});

module.exports = router;
