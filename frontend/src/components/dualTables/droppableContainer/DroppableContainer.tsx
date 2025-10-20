import { useDroppable } from '@dnd-kit/core';

interface Props {
  id: string;
  children: React.ReactNode;
}

export const DroppableContainer = ({ id, children }: Props) => {
  const { setNodeRef } = useDroppable({ id });

  const { setNodeRef: setEndRef } = useDroppable({ id: `${id}-end` });

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

      <div
        ref={setEndRef}
        data-end
        style={{
          height: 48,
          width: '100%',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
};
