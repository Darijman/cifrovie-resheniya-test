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
  const { id, targetIndex } = req.body as { id: string; targetIndex?: number };

  updateQueue.add(`select-${id}`, async () => {
    // Проверяем, вдруг элемент уже выбран
    if (selectedItems.some(i => i.id === id)) {
      console.warn(`⚠️ Item ${id} already selected`);
      return;
    }

    // Удаляем из allItems
    const index = allItems.findIndex(i => i.id === id);
    if (index < 0) return;
    const [item] = allItems.splice(index, 1);

    // Проверяем, нет ли дублей (подстраховка)
    const safeSelected = selectedItems.filter(i => i.id !== id);

    // Вставляем на нужное место
    const insertIndex =
      typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= safeSelected.length
        ? targetIndex
        : safeSelected.length;

    safeSelected.splice(insertIndex, 0, item);

    // Обновляем массив атомарно
    selectedItems.length = 0;
    selectedItems.push(...safeSelected);
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
  if (allItems.some((i) => i.id === id)) return;

  const index = selectedItems.findIndex(i => i.id === id);
  const [item] = index >= 0 ? selectedItems.splice(index, 1) : [];

  if (item) {
    const insertIndex =
      typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= allItems.length
        ? targetIndex
        : 0;
    allItems.splice(insertIndex, 0, item);
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

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'Invalid orderedIds format' });
  }

  updateQueue.add('reorder-all', async () => {
    try {
      const map = new Map(allItems.map((item) => [item.id, item]));
      const newOrder: Item[] = [];

      for (const id of orderedIds) {
        const item = map.get(id);
        if (item) {
          newOrder.push(item);
          map.delete(id);
        }
      }

      for (const item of allItems) {
        if (map.has(item.id)) newOrder.push(item);
      }

      // Безопасная замена по батчам, чтобы не переполнять стек
      allItems.length = 0;

      const BATCH_SIZE = 10_000;
      for (let i = 0; i < newOrder.length; i += BATCH_SIZE) {
        allItems.push(...newOrder.slice(i, i + BATCH_SIZE));
        await new Promise((r) => setTimeout(r, 0)); // разгрузка event loop
      }
    } catch (err) {
      console.error('❌ reorder-all failed:', err);
    }
  });

  res.json({ queued: true });
});

export default router;
