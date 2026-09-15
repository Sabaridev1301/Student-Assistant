const express = require('express');
const cors = require('cors');

const materialsRoute = require('./routes/materials');
const planRoute = require('./routes/plan');
const quizRoute = require('./routes/quiz');
const progressRoute = require('./routes/progress');
const chatRoute = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'ai-study-assistant-backend' }));

app.use('/api/materials', materialsRoute);
app.use('/api/plan', planRoute);
app.use('/api/quiz', quizRoute);
app.use('/api/progress', progressRoute);
app.use('/api/chat', chatRoute);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`AI Study Assistant backend running on http://localhost:${PORT}`);
});
