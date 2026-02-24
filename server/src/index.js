require('dotenv').config();
const express = require('express');
const cors = require('cors');

const todoRoutes = require('./routes/todos');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5500',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.use('/api/todos', todoRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: '服务器内部错误' },
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
