'use client';

import { ItemCard } from '@/components/itemCard/ItemCard';
import { Item } from '@/interfaces/Item';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  item: Item;
}

export const SortableItem = ({ item }: Props) => {
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

