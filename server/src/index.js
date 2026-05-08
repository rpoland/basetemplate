import './env.js'; // must be first — loads .env before any other module reads process.env
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { testConnection } from './db/pool.js';
import healthRouter from './routes/health.js';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import rolesRouter from './routes/roles.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/api', apiRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await testConnection();
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

start();
