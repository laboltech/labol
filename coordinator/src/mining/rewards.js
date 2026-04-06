const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const REWARD_PER_SOLVE = 1000; // $LABOL per correct submission (raw units)

async function creditReward(wallet, amount = REWARD_PER_SOLVE) {
  const { data, error } = await supabase.rpc('increment_balance', {
    p_wallet: wallet,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}

async function getBalance(wallet) {
  const { data, error } = await supabase
    .from('wallets')
    .select('earned_balance, claimed_balance')
    .eq('address', wallet)
    .single();

  if (error && error.code === 'PGRST116') {
    // Not found — return zero
    return { earned: 0, claimed: 0, claimable: 0 };
  }
  if (error) throw error;

  const earned   = data.earned_balance  || 0;
  const claimed  = data.claimed_balance || 0;
  return { earned, claimed, claimable: earned - claimed };
}

async function markClaimed(wallet, amount) {
  const { error } = await supabase.rpc('increment_claimed', {
    p_wallet: wallet,
    p_amount: amount,
  });
  if (error) throw error;
}

module.exports = { creditReward, getBalance, markClaimed, REWARD_PER_SOLVE };
