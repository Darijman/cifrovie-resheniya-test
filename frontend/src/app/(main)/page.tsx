'use client';

import { Typography } from 'antd';
import DualTableDnd from '@/components/dualTables/DualTables';

const { Title } = Typography;
export default function Home() {
  return (
    <div>
      <Title level={1} style={{ textAlign: 'center', margin: 0 }}>
        Home
      </Title>
      <DualTableDnd />
    </div>
  );
}
