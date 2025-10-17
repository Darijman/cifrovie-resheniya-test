import express from 'express';
import cors from 'cors';
import itemsRouter from './routes/items';

const app = express();
const PORT = 9000;

app.use(cors());
app.use(express.json());
app.use('/items', itemsRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
