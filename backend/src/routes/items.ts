import { Router } from 'express';
import { allItems, selectedItems, Item } from '../data/store';
import { RequestQueue } from '../utils/queue';

const router = Router();

// ------------------------
// Очереди для батчинга операций
// ------------------------
const addQueue = new RequestQueue('add', 10_000);   // Каждые 10 секунд добавляет новые элементы
const updateQueue = new RequestQueue('update', 1_000); // Каждую секунду обрабатывает изменения порядка и перемещения
const inProgress = new Set();

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
// -----------------------
router.post('/add', (req, res) => {
  const { id } = req.body as Item;
  if (!id) {
    return res.status(400).json({ error: 'Missing ID!' });
  }

  const exists =
    allItems.some((item) => item.id === id) ||
    selectedItems.some((item) => item.id === id);

  if (exists) {
    return res.status(400).json({ error: 'Item with this ID already exists!' });
  }

  addQueue.add(id, async () => {
    allItems.unshift({ id });
  });

  res.json({ queued: true, id });
});

// ------------------------
// POST /select
// Перенос элемента из allItems в selectedItems
// body: { id: string, targetIndex?: number }
// Использует очередь updateQueue для последовательного применения операций
// ------------------------
router.post('/select', (req, res) => {
  const { id, toId } = req.body as { id: string; toId?: string };
  if (inProgress.has(id)) {
    return res.json({ queued: false, message: `Item ${id} is already being processed` });
  }

  inProgress.add(id);

  updateQueue.add(`select-${id}`, async () => {
    try {
      if (selectedItems.some(i => i.id === id)) return;
      const index = allItems.findIndex(i => i.id === id);
      if (index === -1) return;

      const [item] = allItems.splice(index, 1);

      const insertIndex = toId
        ? selectedItems.findIndex(i => i.id === toId)
        : -1;

      if (insertIndex === -1) selectedItems.push(item);
      else selectedItems.splice(insertIndex, 0, item);
    } finally {
      inProgress.delete(id);
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
  const { id, toId } = req.body as { id: string; toId?: string };
  if (inProgress.has(id)) {
    return res.json({ queued: false, message: `Item ${id} is already being processed` });
  }

  inProgress.add(id);

  updateQueue.add(`deselect-${id}`, async () => {
    try {
      const index = selectedItems.findIndex(i => i.id === id);
      if (index === -1) return;

      const [item] = selectedItems.splice(index, 1);

      const insertIndex = toId
        ? allItems.findIndex(i => i.id === toId)
        : -1;

      if (insertIndex === -1) allItems.push(item);
      else allItems.splice(insertIndex, 0, item);
    } finally {
      inProgress.delete(id);
    }
  });

  res.json({ queued: true });
});


// ------------------------
// POST /reorder
// Перестановка выбранных элементов в selectedItems
// body: { fromId: string, toId: string }
// ------------------------
router.post('/reorder', (req, res) => {
  const { fromId, toId } = req.body as { fromId: string; toId?: string };
  const fromIndex = selectedItems.findIndex(i => i.id === fromId);
  if (fromIndex === -1) return res.status(404).json({ error: 'fromId not found' });

  const [moved] = selectedItems.splice(fromIndex, 1);

  const toIndex = toId ? selectedItems.findIndex(i => i.id === toId) : -1;
  if (toIndex === -1) selectedItems.push(moved);
  else selectedItems.splice(toIndex, 0, moved);

  res.json({ success: true });
});


// ------------------------
// POST /reorder-all
// Перестановка всех элементов в allItems
// body: { fromId: string, toId: string }
// ------------------------
router.post('/reorder-all', (req, res) => {
  const { fromId, toId } = req.body;
  if (!fromId || !toId) return res.status(400).json({ error: 'fromId and toId required' });

  updateQueue.add('reorder-all', async () => {
    const fromIndex = allItems.findIndex(i => i.id === fromId);
    const toIndex = allItems.findIndex(i => i.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = allItems.splice(fromIndex, 1);
    allItems.splice(toIndex, 0, moved);
  });

  res.json({ queued: true });
});

export default router;
