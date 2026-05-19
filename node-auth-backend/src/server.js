require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request logger to debug 404s
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'docagent-node-auth' });
});

// Catch-all for 404s
app.use((req, res) => {
  console.log(`[404] Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ detail: `Route ${req.method} ${req.url} not found` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node Auth Backend running on 0.0.0.0:${PORT}`);
});
