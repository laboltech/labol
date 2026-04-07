require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes    = require('./routes/auth');
const miningRoutes  = require('./routes/mining');
const computeRoutes = require('./routes/compute');
const statsRoutes   = require('./routes/stats');
const burnRoutes    = require('./routes/burn');
const { initRelay } = require('./relay/manager');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/v1/auth',    authRoutes);
app.use('/v1',         miningRoutes);
app.use('/v1',         computeRoutes);
app.use('/v1',         statsRoutes);
app.use('/v1/burn',    burnRoutes);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0', network: 'solana' });
});

const server = app.listen(PORT, () => {
  console.log(`⚡ Labol coordinator running on port ${PORT}`);
});

// Init WebSocket relay manager
initRelay(server);
