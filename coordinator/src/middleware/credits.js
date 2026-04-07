const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const FREE_REQUESTS_PER_HOUR = 5;
const freeUsage = new Map(); // ip → { count, resetAt }

// Check and reserve credits before request
async function checkCredits(req, res, next) {
  const apiKey = req.headers['x-api-key'] ||
    req.headers['authorization']?.replace('Bearer ', '');

  const maxTokens = req.body?.max_tokens || 512;
  const creditsNeeded = maxTokens; // 1 credit per token

  // Free tier — no API key
  if (!apiKey) {
    const ip = req.ip;
    const now = Date.now();
    const usage = freeUsage.get(ip) || { count: 0, resetAt: now + 3600000 };

    if (now > usage.resetAt) {
      usage.count = 0;
      usage.resetAt = now + 3600000;
    }

    if (usage.count >= FREE_REQUESTS_PER_HOUR) {
      return res.status(429).json({
        error: 'free tier limit reached',
        message: 'Burn $LABOL to get compute credits. laboltech.xyz',
      });
    }

    usage.count++;
    freeUsage.set(ip, usage);
    req.isFree = true;
    req.apiKey = null;
    return next();
  }

  // Paid tier — check Supabase
  try {
    const { data, error } = await supabase
      .from('compute_keys')
      .select('wallet, token_balance')
      .eq('key', apiKey)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'invalid API key' });
    }

    if (data.token_balance < creditsNeeded) {
      return res.status(402).json({
        error: 'insufficient credits',
        credits_available: data.token_balance,
        credits_needed: creditsNeeded,
        message: 'Burn more $LABOL to get credits. laboltech.xyz',
      });
    }

    // Reserve credits (pre-deduct)
    await supabase
      .from('compute_keys')
      .update({ token_balance: data.token_balance - creditsNeeded })
      .eq('key', apiKey);

    req.isFree        = false;
    req.apiKey        = apiKey;
    req.creditsNeeded = creditsNeeded;
    req.creditsWallet = data.wallet;
    next();
  } catch (err) {
    console.error('credits check error:', err);
    res.status(500).json({ error: 'credits check failed' });
  }
}

// Refund unused credits after response
async function refundUnused(apiKey, reserved, actualUsed) {
  if (!apiKey || actualUsed >= reserved) return;
  const refund = reserved - actualUsed;
  try {
    await supabase.rpc('increment_compute_credits', {
      p_wallet: apiKey,
      p_credits: refund,
    });
  } catch (err) {
    console.error('refund error:', err);
  }
}

// Log compute usage
async function logUsage(apiKey, relayWallet, tokensUsed, model) {
  try {
    await supabase.from('compute_requests').insert({
      api_key:      apiKey,
      relay_wallet: relayWallet,
      tokens_used:  tokensUsed,
      tokens_burned: tokensUsed,
      model,
    });
  } catch (err) {
    console.error('log usage error:', err);
  }
}

module.exports = { checkCredits, refundUnused, logUsage };
