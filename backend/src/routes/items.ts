import { Router } from 'express';
import { allItems, selectedItems, Item } from '../data/store';
import { RequestQueue } from '../utils/queue';

const router = Router();

// Очереди для батчинга
const addQueue = new RequestQueue('add', 10_000);   // каждые 10 секунд
const updateQueue = new RequestQueue('update', 1_000); // каждую секунду

// Получить элементы с фильтрацией и пагинацией
router.get('/', async (req, res) => {
  const { page = '1', limit = '20', filter = '', selected = 'false' } = req.query;

  const isSelected = selected === 'true';
  const list = isSelected ? selectedItems : allItems;

  const filtered = filter
    ? list.filter((item) => item.id.includes(String(filter)))
    : list;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;

  const items = filtered.slice(start, end);
  res.json(items);
});


router.post('/add', (req, res) => {
  const { id } = req.body as Item;
  if (!id) {
    return res.status(400).json({ error: 'Missing id!' });
  }

  const exists =
    allItems.some((item) => item.id === id) ||
    selectedItems.some((item) => item.id === id);
  if (exists) {
    return res.status(400).json({ error: 'Item with this ID already exists!' });
  }

  addQueue.add(id, async () => {
    allItems.push({ id });
    console.log(`✅ Added item ${id}`);
  });
  res.json({ queued: true });
});

router.post('/select', (req, res) => {
  const { id } = req.body as Item;
  updateQueue.add(`select-${id}`, async () => {
    const index = allItems.findIndex((i) => i.id === id);
    if (index >= 0) {
      const [item] = allItems.splice(index, 1);
      selectedItems.push(item);
      console.log(`✅ Selected item ${id}`);
    }
  });
  res.json({ queued: true });
});

router.post('/reorder', (req, res) => {
  const { orderedIds } = req.body as { orderedIds: string[] };

  updateQueue.add('reorder', async () => {
    const newOrder: Item[] = [];
    for (const id of orderedIds) {
      const item = selectedItems.find((i) => i.id === id);
      if (item) newOrder.push(item);
    }
    selectedItems.length = 0;
    selectedItems.push(...newOrder);
    console.log(`🔄 Reordered selected items`);
  });

  res.json({ queued: true });
});

export default router;
