# ⚡ Labol Tech

> **Mine with your API key. Spend compute with $LABOL.**

Labol Tech is a decentralized AI compute network on Solana. Miners share their AI API capacity to serve inference requests. Users burn `$LABOL` tokens to access AI inference — no subscriptions, no credit cards, no API keys needed.

- **Website:** https://laboltech.xyz
- **X/Twitter:** https://x.com/laboltech
- **Telegram:** https://t.me/laboltech
- **Token:** `$LABOL` on Solana — pump.fun fair launch (CA: TBA)

---

## How It Works

```
[Miners]  ──  register API key  ──►  [Coordinator]
                                           │
[Users]   ──  burn $LABOL       ──►        │  ──►  [Relay Router]  ──►  [AI Response]
                                           │
                                      [Supabase DB]
```

**Miners** install the relay client, register their wallet + AI API key. The relay client connects to the coordinator via WebSocket and serves inference requests. API key never leaves the miner's machine.

**Users** burn `$LABOL` to get compute credits, then call the OpenAI-compatible API endpoint.

---

## Repo Structure

```
labol/
├── coordinator/          # Express server — auth, mining, relay routing
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── auth.js       # Solana wallet signature auth → JWT
│   │   │   ├── mining.js     # Challenge generation + reward tracking
│   │   │   ├── compute.js    # OpenAI-compatible inference endpoint
│   │   │   └── stats.js      # Network stats + leaderboard
│   │   ├── relay/
│   │   │   └── manager.js    # WebSocket relay manager
│   │   ├── mining/
│   │   │   ├── challenge.js  # Challenge generation + verification
│   │   │   └── rewards.js    # Supabase reward tracking
│   │   └── middleware/
│   │       └── auth.js       # JWT middleware
│   ├── .env.example
│   └── package.json
├── relay-client/         # npm package miners install
│   ├── src/
│   │   ├── cli.js        # CLI entrypoint (labol-relay start)
│   │   └── index.js      # WebSocket relay core
│   └── package.json
├── docs/
│   └── schema.sql        # Supabase database schema
└── README.md
```

---

## Quick Start — Miners

```bash
npm install -g labol-relay
```

```bash
labol-relay start \
  --wallet YOUR_SOLANA_WALLET \
  --ai-key sk-YOUR_API_KEY \
  --model  gpt-4o-mini
```

Works with: OpenAI · Anthropic · OpenRouter · Groq · Ollama (any OpenAI-compatible provider)

---

## Quick Start — Developers

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.laboltech.xyz/v1",
    api_key="lk_YOUR_KEY",
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)
```

---

## Running the Coordinator Locally

```bash
cd coordinator
cp .env.example .env
# Fill in JWT_SECRET, SUPABASE_URL, SUPABASE_KEY

npm install
npm run dev
```

Server runs on `http://localhost:3000`. See `docs/schema.sql` for Supabase setup.

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /v1/auth/nonce | Get auth nonce for wallet |
| POST | /v1/auth/verify | Verify signature → JWT |

### Mining
| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/challenge | Get mining challenge (requires JWT) |
| POST | /v1/submit | Submit answer → earn $LABOL |
| GET | /v1/claims/status?wallet= | Check unclaimed balance |

### Compute
| Method | Path | Description |
|--------|------|-------------|
| POST | /v1/chat/completions | OpenAI-compatible inference |
| GET | /v1/compute/health | Network status |
| GET | /v1/compute/providers | Online relay miners |
| GET | /v1/models | Available models |

### Stats
| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/stats | Network stats |
| GET | /v1/leaderboard | Top miners |

---

## Tokenomics

| | |
|---|---|
| Chain | Solana |
| Launch | pump.fun (fair launch) |
| Team allocation | 0% |
| VC allocation | 0% |
| Burn rate | 1 $LABOL = 1,000 output tokens |
| Miner reward | Base reward per solved challenge |
| Relay reward | 2x weight per fulfilled request |

---

## Roadmap

- [x] Protocol design & tokenomics
- [x] Coordinator server — auth module
- [x] Relay WebSocket infrastructure
- [x] Mining challenge system
- [ ] Supabase reward tracking (integration)
- [ ] Burn detection (Helius webhook)
- [ ] Compute API key system
- [ ] Dashboard
- [ ] Token launch on pump.fun

---

## License

MIT
