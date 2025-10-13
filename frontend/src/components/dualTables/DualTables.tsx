'use client';

import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Card, Input, message, Spin, Typography } from 'antd';
import { Item } from '@/interfaces/Item';
import { ItemCard } from '../itemCard/ItemCard';
import { DroppableContainer } from './droppableContainer/DroppableContainer';
import { PlusCircleOutlined } from '@ant-design/icons';
import api from '../../../axiosConfig';
import InfiniteScroll from 'react-infinite-scroll-component';

const LIMIT = 20;
const { Title } = Typography;

const SortableItem: React.FC<{ item: Item }> = ({ item }) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    opacity: isDragging ? 0.4 : 1,
    marginBottom: 10,
    width: '100%',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ItemCard item={item} />
    </div>
  );
};

export default function DualTableDnd() {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  const [pageAll, setPageAll] = useState(1);
  const [pageSelected, setPageSelected] = useState(1);
  const [hasMoreAll, setHasMoreAll] = useState(true);
  const [hasMoreSelected, setHasMoreSelected] = useState(true);
  const [customId, setCustomId] = useState('');
  const [messageApi, contextHolder] = message.useMessage({ maxCount: 2, duration: 5 });

  const [isAdding, setIsAdding] = useState<boolean>(false);

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
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      }
    };
    fetchInitial();
  }, []);

  const fetchMoreAll = async () => {
    const nextPage = pageAll + 1;
    const { data } = await api.get<Item[]>('/items', { params: { page: nextPage, limit: LIMIT, selected: false } });
    if (data.length > 0) {
      setAllItems((prev) => [...prev, ...data]);
      setPageAll(nextPage);
      if (data.length < LIMIT) setHasMoreAll(false);
    } else {
      setHasMoreAll(false);
    }
  };

  const fetchMoreSelected = async () => {
    const nextPage = pageSelected + 1;
    const { data } = await api.get<Item[]>('/items', { params: { page: nextPage, limit: LIMIT, selected: true } });
    if (data.length > 0) {
      setSelectedItems((prev) => [...prev, ...data]);
      setPageSelected(nextPage);
      if (data.length < LIMIT) setHasMoreSelected(false);
    } else {
      setHasMoreSelected(false);
    }
  };

  const findContainer = (id: string) => {
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
      let overIndex = sourceItems.findIndex((i) => i.id === overId);

      if (overIndex === -1 || overId === overContainer) overIndex = sourceItems.length - 1;

      if (oldIndex === overIndex) return;

      const newArr = arrayMove(sourceItems, oldIndex, overIndex);
      sourceSetter(newArr);

      const url = activeContainer === 'all' ? '/items/reorder-all' : '/items/reorder';
      void api.post(url, { orderedIds: newArr.map((i) => i.id) }).catch(console.error);
      return;
    }

    const movedItem = sourceItems.find((i) => i.id === activeId);
    if (!movedItem) return;

    const newSource = sourceItems.filter((i) => i.id !== activeId);

    let targetIndex = targetItems.findIndex((i) => i.id === overId);
    if (targetIndex === -1 || overId === overContainer) targetIndex = targetItems.length;

    const newTarget = [...targetItems.slice(0, targetIndex), movedItem, ...targetItems.slice(targetIndex)];

    sourceSetter(newSource);
    targetSetter(newTarget);

    if (activeContainer === 'all' && overContainer === 'selected') {
      void api.post('/items/select', { id: activeId, targetIndex }).catch(console.error);
      void api.post('/items/reorder', { orderedIds: newTarget.map((i) => i.id) }).catch(console.error);
    } else if (activeContainer === 'selected' && overContainer === 'all') {
      void api.post('/items/deselect', { id: activeId, targetIndex }).catch(console.error);
      void api.post('/items/reorder', { orderedIds: newSource.map((i) => i.id) }).catch(console.error);
    }
  };

  const handleAdd = async () => {
    if (!customId.trim()) return;
    setIsAdding(true);

    try {
      const { data } = await api.post('/items/add', { id: customId });
      setAllItems((prev) => [data, ...prev]);
      setCustomId('');

      messageApi.success(`Item ${data.id} added successfully!`);
    } catch (err: any) {
      messageApi.open({
        type: 'error',
        content: err.response?.data?.error || 'Failed to add new item!',
      });
    } finally {
      setIsAdding(false);
    }
  };

  console.log(`allItems.length`, allItems.length);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {contextHolder}

      <div style={{ display: 'flex', gap: 24, padding: 16 }}>
        <Card
          id='allScroll'
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>All Items</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  placeholder='Custom ID'
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  size='small'
                  style={{
                    width: 120,
                    color: 'black',
                  }}
                />
                <Button loading={isAdding} icon={<PlusCircleOutlined />} type='primary' size='small' onClick={handleAdd}>
                  Add
                </Button>
              </div>
            </div>
          }
          style={{ flex: 1, height: 600, overflowY: 'auto' }}
        >
          <InfiniteScroll
            dataLength={allItems.length}
            next={fetchMoreAll}
            hasMore={hasMoreAll}
            loader={<Spin size='large' style={{ display: 'block', margin: '16px auto' }} />}
            scrollableTarget='allScroll'
          >
            <DroppableContainer id='all'>
              <SortableContext id='all' items={allItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {allItems.map((item) => (
                  <SortableItem key={item.id} item={item} />
                ))}
              </SortableContext>
            </DroppableContainer>
          </InfiniteScroll>
        </Card>

        <Card id='selectedScroll' title='Selected Items' style={{ flex: 1, height: 600, overflowY: 'auto' }}>
          <InfiniteScroll
            dataLength={selectedItems.length}
            next={fetchMoreSelected}
            hasMore={hasMoreSelected}
            loader={<Spin size='large' style={{ display: 'block', margin: '16px auto' }} />}
            scrollableTarget='selectedScroll'
          >
            <DroppableContainer id='selected'>
              <SortableContext id='selected' items={selectedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {selectedItems.map((item) => (
                  <SortableItem key={item.id} item={item} />
                ))}
              </SortableContext>
            </DroppableContainer>
          </InfiniteScroll>
        </Card>
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
}
