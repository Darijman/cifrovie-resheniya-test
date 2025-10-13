'use client';

import { Typography } from 'antd';
import { Item } from '@/interfaces/Item';
import './itemCard.css';

const { Title } = Typography;

interface Props {
  item: Item;
}

export const ItemCard = ({ item }: Props) => {
  const { id } = item;
  return (
    <div className='item_card'>
      <Title style={{ textAlign: 'center', margin: 0 }}>{id}</Title>
    </div>
  );
};
