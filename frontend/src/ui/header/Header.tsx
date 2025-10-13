'use client';

import { Typography } from 'antd';
import { SwitchTheme } from './switchTheme/SwitchTheme';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './header.css';

const { Title } = Typography;

export const Header = () => {
  const router = useRouter();

  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <header className='header'>
      <div className='header_inner'>
        <Title level={5} onClick={() => router.push('/')} className='header_title'>
          Home
        </Title>
        <SwitchTheme />
      </div>
    </header>
  );
};
