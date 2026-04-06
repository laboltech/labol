const crypto = require('crypto');

// Generate a prose document + multi-hop questions
// Deterministic verification — no AI needed to solve
function generateChallenge() {
  const id = crypto.randomUUID();
  const seed = Math.floor(Math.random() * 10000);

  // Simple math-based challenge for MVP
  // Each answer is derived from the document values
  const a = (seed % 50) + 10;       // 10-59
  const b = (seed % 30) + 5;        // 5-34
  const c = (seed % 20) + 1;        // 1-20
  const sum = a + b;
  const product = b * c;
  const diff = sum - c;

  const document = `
NETWORK RELAY REPORT #${seed}

Station Alpha processed ${a} requests in the last cycle.
Station Beta processed ${b} requests in the same period.
Station Gamma handled ${c} relay handoffs successfully.

Total throughput for Alpha and Beta combined reached ${sum} operations.
Beta and Gamma jointly processed ${product} compute units.
The difference between combined Alpha-Beta output and Gamma handoffs is ${diff}.
  `.trim();

  const answers = [sum, product, diff];
  const checksum = answers.reduce((acc, v) => acc + v, 0) % 997;
  const artifact = [...answers, checksum].join('|');

  return {
    id,
    document,
    questions: [
      'What is the combined request count for Station Alpha and Beta?',
      'What is the product of Station Beta requests and Gamma handoffs?',
      'What is the difference between Alpha-Beta combined and Gamma handoffs?',
    ],
    _answer: artifact, // stored server-side, never sent to client
  };
}

function verifyArtifact(challenge, artifact) {
  return artifact === challenge._answer;
}

module.exports = { generateChallenge, verifyArtifact };
