#!/usr/bin/env node
const { program } = require('commander');
const { startRelay } = require('./index');

program
  .name('labol-relay')
  .description('Labol Tech relay client — share your API key, earn $LABOL')
  .version('0.1.0');

program
  .command('start')
  .description('Start the relay miner')
  .requiredOption('--wallet <wallet>',   'Your Solana wallet address')
  .requiredOption('--ai-key <key>',      'Your AI provider API key')
  .option('--ai-url <url>',              'AI provider base URL', 'https://api.openai.com/v1')
  .option('--model <model>',             'Model to use', 'gpt-4o-mini')
  .option('--coordinator <url>',         'Coordinator URL', 'wss://api.laboltech.xyz')
  .action((opts) => {
    startRelay({
      wallet:      opts.wallet,
      aiKey:       opts.aiKey,
      aiUrl:       opts.aiUrl,
      model:       opts.model,
      coordinator: opts.coordinator,
    });
  });

program.parse();
