const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { routeRequest, getOnlineMiners } = require('../relay/manager');
const { checkCredits, logUsage } = require('../middleware/credits');

// POST /v1/chat/completions — OpenAI-compatible
router.post('/chat/completions', checkCredits, async (req, res) => {
  const { messages, model, max_tokens = 512 } = req.body;
  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: 'messages array required' });

  const requestId = crypto.randomUUID();
  const prompt    = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  const miners = getOnlineMiners();
  if (miners.length === 0) {
    return res.status(503).json({
      error: 'no relay miners online',
      code:  'no_capacity',
      message: 'No relay providers online. Try again later.',
    });
  }

  try {
    const response    = await routeRequest(requestId, prompt, model, max_tokens);
    const tokensUsed  = Math.ceil(response.length / 4);
    const relayWallet = miners[0]?.wallet || 'unknown';

    await logUsage(req.apiKey, relayWallet, tokensUsed, model || 'auto');

    res.json({
      id:      `chatcmpl-${requestId}`,
      object:  'chat.completion',
      model:   model || 'auto',
      choices: [{
        index:         0,
        message:       { role: 'assistant', content: response },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens:     0,
        completion_tokens: tokensUsed,
        total_tokens:      tokensUsed,
      },
      labol: {
        credits_used: tokensUsed,
        is_free:      req.isFree,
      },
    });
  } catch (err) {
    if (err.message === 'no_relay_miners_online')
      return res.status(503).json({ error: 'no relay miners online', code: 'no_capacity' });
    if (err.message === 'relay_timeout')
      return res.status(504).json({ error: 'relay timeout' });
    res.status(500).json({ error: 'compute request failed' });
  }
});

// GET /v1/compute/health
router.get('/compute/health', (req, res) => {
  const miners = getOnlineMiners();
  res.json({
    status:          miners.length > 0 ? 'online' : 'offline',
    relay_providers: miners.length,
  });
});

// GET /v1/compute/providers
router.get('/compute/providers', (req, res) => {
  res.json({ providers: getOnlineMiners() });
});

// GET /v1/models
router.get('/models', (req, res) => {
  const miners = getOnlineMiners();
  const models = [...new Set(miners.map(m => m.model))];
  res.json({ models: models.map(id => ({ id, object: 'model' })) });
});

module.exports = router;
