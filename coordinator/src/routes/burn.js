const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const BURN_ADDRESS  = process.env.BURN_ADDRESS || '1nc1nerator11111111111111111111111111111111';
const TOKEN_MINT    = process.env.TOKEN_MINT;
const HELIUS_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

// 1 $LABOL = 1,000 compute credits
const CREDITS_PER_TOKEN = 1000;

// POST /v1/burn/webhook — called by Helius
router.post('/webhook', async (req, res) => {
  // Verify Helius signature
  if (HELIUS_SECRET) {
    const sig = req.headers['helius-signature'];
    const expected = crypto
      .createHmac('sha256', HELIUS_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (sig !== expected) {
      return res.status(401).json({ error: 'invalid signature' });
    }
  }

  const events = Array.isArray(req.body) ? req.body : [req.body];

  for (const event of events) {
    try {
      await processBurnEvent(event);
    } catch (err) {
      console.error('burn event error:', err);
    }
  }

  res.json({ ok: true });
});

async function processBurnEvent(event) {
  // Helius enhanced transaction format
  const transfers = event?.tokenTransfers || [];

  for (const transfer of transfers) {
    // Check: correct token mint + destination is burn address
    if (
      transfer.mint === TOKEN_MINT &&
      transfer.toUserAccount === BURN_ADDRESS &&
      transfer.tokenAmount > 0
    ) {
      const wallet  = transfer.fromUserAccount;
      const amount  = Math.floor(transfer.tokenAmount);
      const credits = amount * CREDITS_PER_TOKEN;
      const txSig   = event.signature;

      console.log(`🔥 Burn detected: ${amount} $LABOL from ${wallet} → ${credits} credits`);

      // Check not already processed
      const { data: existing } = await supabase
        .from('burn_events')
        .select('id')
        .eq('tx_signature', txSig)
        .single();

      if (existing) {
        console.log(`Already processed tx: ${txSig}`);
        continue;
      }

      // Record burn event
      await supabase.from('burn_events').insert({
        tx_signature: txSig,
        wallet,
        token_amount: amount,
        credits_issued: credits,
      });

      // Credit compute balance
      await supabase.rpc('increment_compute_credits', {
        p_wallet: wallet,
        p_credits: credits,
      });

      console.log(`✓ Credited ${credits} compute credits to ${wallet}`);
    }
  }
}

// GET /v1/burn/balance?wallet=...
router.get('/balance', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const { data, error } = await supabase
    .from('compute_keys')
    .select('token_balance, tokens_burned')
    .eq('wallet', wallet)
    .single();

  if (error && error.code === 'PGRST116') {
    return res.json({ wallet, compute_credits: 0, tokens_burned: 0 });
  }
  if (error) return res.status(500).json({ error: 'failed to fetch balance' });

  res.json({
    wallet,
    compute_credits: data.token_balance  || 0,
    tokens_burned:   data.tokens_burned  || 0,
  });
});

// GET /v1/burn/history?wallet=...
router.get('/history', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const { data, error } = await supabase
    .from('burn_events')
    .select('*')
    .eq('wallet', wallet)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: 'failed to fetch history' });
  res.json({ history: data || [] });
});

module.exports = router;
