'use client';

import { useState } from 'react';
import { Card, Input, Button, Spin, message, Typography } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DroppableContainer } from '../droppableContainer/DroppableContainer';
import { SortableItem } from '../sortableItem/SortableItem';
import { Item } from '@/interfaces/Item';
import InfiniteScroll from 'react-infinite-scroll-component';
import api from '../../../../axiosConfig';
import './allItems.css';

const { Title } = Typography;

interface Props {
  allItems: Item[];
  fetchMoreAll: () => void;
  hasMoreAll: boolean;
  handleFilterChange: (value: string, type: 'all' | 'selected') => void;
  setAllItems: React.Dispatch<React.SetStateAction<Item[]>>;
  messageApi: ReturnType<typeof message.useMessage>[0];
  error?: string;
}

export function AllItems({ allItems, fetchMoreAll, hasMoreAll, handleFilterChange, messageApi, error }: Props) {
  const [customId, setCustomId] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const handleAdd = async () => {
    if (!customId.trim()) return;
    setIsAdding(true);

    try {
      const { data } = await api.post('/items/add', { id: customId });
      if (data.queued) {
        messageApi.success(`Item ${customId} added to queue. Will appear soon.`);
      } else {
        messageApi.success(`Item ${customId} added successfully!`);
      }
      setCustomId('');
    } catch (err: any) {
      messageApi.error(err.response?.data?.error || 'Failed to add new item!');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card
      id='allScroll'
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>All Items</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input.Search
              placeholder='Search ID...'
              allowClear
              onChange={(e) => handleFilterChange(e.target.value, 'all')}
              size='middle'
              style={{ width: 150 }}
              className='dual_tables_input_search'
            />
            <Input
              placeholder='Custom ID'
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              size='middle'
              style={{ width: 150, color: 'black' }}
            />
            <Button
              className='all_items_add_button'
              disabled={!!error}
              loading={isAdding}
              icon={<PlusCircleOutlined />}
              type='primary'
              size='middle'
              onClick={handleAdd}
            >
              Add
            </Button>
          </div>
        </div>
      }
      style={{ flex: 1, height: 600, overflowY: 'auto' }}
    >
      {error ? (
        <Title level={3} style={{ textAlign: 'center', color: 'red' }}>
          {error}
        </Title>
      ) : (
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
      )}
    </Card>
  );
}
