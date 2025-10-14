'use client';

import { Card, Input, Spin, Typography } from 'antd';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DroppableContainer } from '../droppableContainer/DroppableContainer';
import { Item } from '@/interfaces/Item';
import { SortableItem } from '../sortableItem/SortableItem';
import InfiniteScroll from 'react-infinite-scroll-component';

const { Title } = Typography;

interface Props {
  selectedItems: Item[];
  fetchMoreSelected: () => void;
  hasMoreSelected: boolean;
  handleFilterChange: (value: string, type: 'all' | 'selected') => void;
  error?: string;
}

export function SelectedItems({ selectedItems, fetchMoreSelected, hasMoreSelected, handleFilterChange, error }: Props) {
  return (
    <Card
      id='selectedScroll'
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Selected Items</span>
          <Input.Search
            placeholder='Search ID...'
            allowClear
            onChange={(e) => handleFilterChange(e.target.value, 'selected')}
            size='middle'
            style={{ width: 150 }}
            className='dual_tables_input_search'
          />
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
      )}
    </Card>
  );
}
