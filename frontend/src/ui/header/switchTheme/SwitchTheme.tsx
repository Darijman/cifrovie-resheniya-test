'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import SunIcon from '@/assets/svg/sun-icon.svg';
import MoonIcon from '@/assets/svg/moon-icon.svg';
import './switchTheme.css';

export const SwitchTheme = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button onClick={toggleTheme} className='theme-toggle-button' aria-label='Toggle Theme'>
      <div className='theme-toggle-wrapper'>
        <SunIcon className={`theme-icon sun-icon ${!mounted ? 'preload' : ''}`} />
        <MoonIcon className={`theme-icon moon-icon ${!mounted ? 'preload' : ''}`} />
      </div>
    </button>
  );
};
