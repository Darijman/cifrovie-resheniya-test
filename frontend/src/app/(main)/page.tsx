'use client';

import { Typography } from 'antd';
import { DualTables } from '@/components/dualTables/DualTables';

const { Title } = Typography;

export default function Home() {

  return (
    <div>
      <Title level={1} style={{ textAlign: 'center', margin: 0 }}>
        Home
      </Title>
      <DualTables />
    </div>
  );
}
