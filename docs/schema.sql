-- Labol Tech — Supabase Schema
-- Run this in your Supabase SQL editor

-- Wallets & balances
CREATE TABLE IF NOT EXISTS wallets (
  address          TEXT PRIMARY KEY,
  earned_balance   BIGINT DEFAULT 0,
  claimed_balance  BIGINT DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mining submissions log
CREATE TABLE IF NOT EXISTS submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet       TEXT REFERENCES wallets(address),
  challenge_id TEXT NOT NULL,
  correct      BOOLEAN NOT NULL,
  reward       BIGINT DEFAULT 0,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compute API keys (user-facing, for buying inference)
CREATE TABLE IF NOT EXISTS compute_keys (
  key              TEXT PRIMARY KEY,
  wallet           TEXT,
  token_balance    BIGINT DEFAULT 0,
  tokens_burned    BIGINT DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compute usage log
CREATE TABLE IF NOT EXISTS compute_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key        TEXT,
  relay_wallet   TEXT,
  tokens_used    INTEGER DEFAULT 0,
  tokens_burned  BIGINT DEFAULT 0,
  model          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RPC function: increment earned balance (upsert)
CREATE OR REPLACE FUNCTION increment_balance(p_wallet TEXT, p_amount BIGINT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO wallets (address, earned_balance)
  VALUES (p_wallet, p_amount)
  ON CONFLICT (address)
  DO UPDATE SET earned_balance = wallets.earned_balance + p_amount;
END;
$$ LANGUAGE plpgsql;

-- RPC function: increment claimed balance
CREATE OR REPLACE FUNCTION increment_claimed(p_wallet TEXT, p_amount BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE wallets
  SET claimed_balance = claimed_balance + p_amount
  WHERE address = p_wallet;
END;
$$ LANGUAGE plpgsql;
