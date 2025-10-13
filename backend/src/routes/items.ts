import { Router } from 'express';
import { allItems, selectedItems, Item } from '../data/store';
import { RequestQueue } from '../utils/queue';

const router = Router();

// ------------------------
// Очереди для батчинга операций
// ------------------------
const addQueue = new RequestQueue('add', 10_000);   // Каждые 10 секунд добавляет новые элементы
const updateQueue = new RequestQueue('update', 1_000); // Каждую секунду обрабатывает изменения порядка и перемещения

// ------------------------
// GET /
// Получить список элементов с фильтрацией и пагинацией
// query params:
//   page - номер страницы (по умолчанию 1)
//   limit - количество элементов на странице (по умолчанию 20)
//   filter - строка фильтра по id
//   selected - true или false, какие элементы отдавать: выбранные или все
// ------------------------
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

// ------------------------
// POST /add
// Добавление нового элемента в allItems
// body: { id: string }
// Использует очередь addQueue, чтобы пакетно добавлять элементы каждые 10 секунд
// ------------------------
router.post('/add', async (req, res) => {
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

  const promise = new Promise<void>((resolve) => {
    addQueue.add(id, async () => {
      allItems.unshift({id});
      resolve();
    });
  });

  await promise;
  res.json({id});
});


// ------------------------
// POST /select
// Перенос элемента из allItems в selectedItems
// body: { id: string, targetIndex?: number }
// Использует очередь updateQueue для последовательного применения операций
// ------------------------
router.post('/select', (req, res) => {
  const { id, targetIndex } = req.body as { id: string; targetIndex?: number };

  updateQueue.add(`select-${id}`, async () => {
    const index = allItems.findIndex((i) => i.id === id);
    if (index >= 0) {
      const [item] = allItems.splice(index, 1);

      const insertIndex =
        typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= selectedItems.length
          ? targetIndex
          : selectedItems.length;

      selectedItems.splice(insertIndex, 0, item);
      console.log(`✅ Selected item ${id} → inserted at ${insertIndex}`);
    }
  });

  res.json({ queued: true });
});

// ------------------------
// POST /deselect
// Перенос элемента из selectedItems обратно в allItems
// body: { id: string, targetIndex?: number }
// Здесь можно добавить очередь updateQueue, чтобы тоже обрабатывать батчами
// ------------------------
router.post('/deselect', (req, res) => {
  const { id, targetIndex } = req.body as { id: string; targetIndex?: number };

  const index = selectedItems.findIndex(i => i.id === id);
  const [item] = index >= 0 ? selectedItems.splice(index, 1) : [];

  if (item) {
    const insertIndex =
      typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= allItems.length
        ? targetIndex
        : 0;
    allItems.splice(insertIndex, 0, item);
    console.log(`✅ Deselected item ${id} → inserted at ${insertIndex}`);
  }

  res.json({ success: true });
});

// ------------------------
// POST /reorder
// Перестановка выбранных элементов в selectedItems
// body: { orderedIds: string[] } - новый порядок id
// Использует очередь updateQueue
// ------------------------
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

// ------------------------
// POST /reorder-all
// Перестановка всех элементов в allItems
// body: { orderedIds: string[] } - новый порядок id
// Использует очередь updateQueue
// ------------------------
router.post('/reorder-all', (req, res) => {
  const { orderedIds } = req.body as { orderedIds: string[] };

  updateQueue.add('reorder-all', async () => {
    const newOrder: Item[] = [];
    for (const id of orderedIds) {
      const item = allItems.find((i) => i.id === id);
      if (item) newOrder.push(item);
    }
    allItems.length = 0;
    allItems.push(...newOrder);
    console.log(`🔄 Reordered allItems`);
  });

  res.json({ queued: true });
});

export default router;
