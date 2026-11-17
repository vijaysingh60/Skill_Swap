import cors from 'cors';
import express from 'express';
import { config } from './config/index.js';
import { errorHandler, notFound } from './middleware/errors.js';
import routes from './routes/index.js';

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '50kb' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
