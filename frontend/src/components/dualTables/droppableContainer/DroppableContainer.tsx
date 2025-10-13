import { useDroppable } from '@dnd-kit/core';

interface Props {
  id: string;
  children: React.ReactNode;
}

export const DroppableContainer = ({ id, children }: Props) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 200,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
};
