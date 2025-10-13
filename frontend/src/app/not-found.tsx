'use client';

import { Button, Result, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function NotFound() {
  return (
    <Result
      status='404'
      title='404'
      style={{ margin: '0 auto' }}
      subTitle={<Title level={3}>Sorry, the page you visited does not exist.</Title>}
      extra={
        <Button type='primary' href='/' iconPosition='start' icon={<ArrowLeftOutlined />}>
          Back Home
        </Button>
      }
    />
  );
}
