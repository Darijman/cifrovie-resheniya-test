'use client';

import { useEffect, useState } from 'react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Typography, message } from 'antd';
import { Item } from '@/interfaces/Item';
import { AllItems } from './allItems/AllItems';
import { SelectedItems } from './selectedItems/SelectedItems';
import api from '../../../axiosConfig';
import './dualTables.css';

const LIMIT = 20;
const { Title } = Typography;

export const DualTables = () => {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  const [pageAll, setPageAll] = useState<number>(1);
  const [pageSelected, setPageSelected] = useState<number>(1);
  const [hasMoreAll, setHasMoreAll] = useState<boolean>(true);
  const [hasMoreSelected, setHasMoreSelected] = useState<boolean>(true);

  const [searchAll, setSearchAll] = useState<string>('');
  const [searchSelected, setSearchSelected] = useState<string>('');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const [initialError, setInitialError] = useState<string>('');
  const [allItemsError, setAllItemsError] = useState<string>('');
  const [selectedItemsError, setSelectedItemsError] = useState<string>('');

  const [messageApi, contextHolder] = message.useMessage({ maxCount: 2, duration: 5 });
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [allRes, selectedRes] = await Promise.all([
          api.get<Item[]>('/items', { params: { page: 1, limit: LIMIT, selected: false } }),
          api.get<Item[]>('/items', { params: { page: 1, limit: LIMIT, selected: true } }),
        ]);

        setAllItems(allRes.data);
        setSelectedItems(selectedRes.data);
        setHasMoreAll(allRes.data.length === LIMIT);
        setHasMoreSelected(selectedRes.data.length === LIMIT);
      } catch {
        setInitialError('Failed to load data!');
      }
    };

    fetchInitial();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get<Item[]>('/items', {
          params: { page: 1, limit: pageSelected * LIMIT, selected: true, filter: searchSelected },
        });

        setSelectedItems((prev) => {
          const prevIds = new Set(prev.map((i) => i.id));
          const newItems = data.filter((i) => !prevIds.has(i.id) && !pendingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } catch {
        setSelectedItemsError(`Failed to update Selected Items!`);
      }
    }, 1_000);

    return () => clearInterval(interval);
  }, [pageSelected, searchSelected, messageApi, pendingIds]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get<Item[]>('/items', {
          params: { page: 1, limit: pageAll * LIMIT, selected: false, filter: searchAll },
        });
        setAllItems((prev) => {
          const prevIds = prev.map((i) => i.id);
          const newIds = data.map((i) => i.id);
          if (JSON.stringify(prevIds) === JSON.stringify(newIds)) return prev;
          return data;
        });
      } catch {
        setAllItemsError(`Failed to update All Items!`);
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [pageAll, searchAll, messageApi]);

  const fetchMoreAll = async () => {
    const nextPage = pageAll + 1;
    const { data } = await api.get<Item[]>('/items', {
      params: { page: nextPage, limit: LIMIT, selected: false, filter: searchAll },
    });
    if (data.length) {
      setAllItems((prev) => [...prev, ...data]);
      setPageAll(nextPage);
      if (data.length < LIMIT) setHasMoreAll(false);
    } else setHasMoreAll(false);
  };

  const fetchMoreSelected = async () => {
    const nextPage = pageSelected + 1;
    const { data } = await api.get<Item[]>('/items', {
      params: { page: nextPage, limit: LIMIT, selected: true, filter: searchSelected },
    });
    if (data.length) {
      setSelectedItems((prev) => [...prev, ...data]);
      setPageSelected(nextPage);
      if (data.length < LIMIT) setHasMoreSelected(false);
    } else setHasMoreSelected(false);
  };

  const findContainer = (id: string) => {
    if (!id) return null;
    if (id.endsWith('-end')) {
      const containerId = id.replace(/-end$/, '');
      return containerId;
    }
    if (allItems.some((i) => i.id === id)) return 'all';
    if (selectedItems.some((i) => i.id === id)) return 'selected';
    return null;
  };

  const onDragStart = (event: any) => {
    const id = event.active.id as string;
    const item = allItems.find((i) => i.id === id) || selectedItems.find((i) => i.id === id);
    setActiveItem(item || null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveItem(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;
    if (!activeContainer || !overContainer) return;

    const sourceItems = activeContainer === 'all' ? allItems : selectedItems;
    const targetItems = overContainer === 'all' ? allItems : selectedItems;
    const sourceSetter = activeContainer === 'all' ? setAllItems : setSelectedItems;
    const targetSetter = overContainer === 'all' ? setAllItems : setSelectedItems;

    if (activeContainer === overContainer) {
      const oldIndex = sourceItems.findIndex((i) => i.id === activeId);
      const overIndex =
        overId.endsWith('-end') || overId === overContainer ? sourceItems.length - 1 : sourceItems.findIndex((i) => i.id === overId);

      const newArr = arrayMove(sourceItems, oldIndex, overIndex);
      sourceSetter(newArr);

      const url = activeContainer === 'all' ? '/items/reorder-all' : '/items/reorder';
      const toId = overId.endsWith('-end') || overId === overContainer ? undefined : overId;
      void api.post(url, { fromId: activeId, toId });
    } else {
      const movedItem = sourceItems.find((i) => i.id === activeId);
      if (!movedItem) return;

      const newSource = sourceItems.filter((i) => i.id !== activeId);
      const targetIndex =
        overId.endsWith('-end') || overId === overContainer ? targetItems.length : targetItems.findIndex((i) => i.id === overId);

      const newTarget = [...targetItems];
      newTarget.splice(targetIndex, 0, movedItem);

      sourceSetter(newSource);
      targetSetter(newTarget);

      setPendingIds((prev) => new Set(prev).add(activeId));

      const url = activeContainer === 'all' && overContainer === 'selected' ? '/items/select' : '/items/deselect';
      const toId = overId.endsWith('-end') || overId === overContainer ? undefined : overId;

      void api.post(url, { id: activeId, toId }).finally(() => {
        setPendingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(activeId);
          return newSet;
        });
      });
    }
  };

  const handleFilterChange = async (value: string, type: 'all' | 'selected') => {
    if (type === 'all') setSearchAll(value);
    else setSearchSelected(value);

    const { data } = await api.get('/items', {
      params: { page: 1, limit: LIMIT, filter: value, selected: type === 'selected' },
    });

    if (type === 'all') {
      setAllItems(data);
      setPageAll(1);
      setHasMoreAll(data.length === LIMIT);
    } else {
      setSelectedItems(data);
      setPageSelected(1);
      setHasMoreSelected(data.length === LIMIT);
    }
  };

  if (initialError) {
    return (
      <Title level={3} style={{ textAlign: 'center', color: 'red' }}>
        {initialError}
      </Title>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {contextHolder}

      <div style={{ display: 'flex', gap: 24, padding: 16 }}>
        <AllItems
          allItems={allItems}
          fetchMoreAll={fetchMoreAll}
          hasMoreAll={hasMoreAll}
          handleFilterChange={handleFilterChange}
          setAllItems={setAllItems}
          messageApi={messageApi}
          error={allItemsError}
        />

        <SelectedItems
          selectedItems={selectedItems}
          fetchMoreSelected={fetchMoreSelected}
          hasMoreSelected={hasMoreSelected}
          handleFilterChange={handleFilterChange}
          error={selectedItemsError}
        />
      </div>

      <DragOverlay>
        {activeItem ? (
          <div
            style={{
              padding: '20px',
              background: 'var(--secondary-text-color)',
              border: '1px solid var(--primary-text-color)',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'grab',
            }}
          >
            <Title style={{ textAlign: 'center', margin: 0 }}>{activeItem.id}</Title>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
