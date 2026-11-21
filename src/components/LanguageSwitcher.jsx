import React from 'react';
import { useLanguage } from '../hooks/useLanguage.jsx';

export default function LanguageSwitcher({ className = '', size = 'md' }) {
  const { language, setLanguage } = useLanguage();

  const isSmall = size === 'sm';
  const padding = isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <div
      role="group"
      aria-label="Language selection / மொழி தேர்வு"
      className={`inline-flex items-center rounded-full bg-[#F1F3F4] border border-[#DADCE0] p-0.5 shadow-2xs ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#188038] cursor-pointer ${padding} ${
          language === 'en'
            ? 'bg-[#188038] text-white shadow-xs'
            : 'text-[#5F6368] hover:text-[#202124]'
        }`}
      >
        English
      </button>
      <span className="text-[#DADCE0] px-1 select-none text-xs">|</span>
      <button
        type="button"
        onClick={() => setLanguage('ta')}
        aria-pressed={language === 'ta'}
        className={`rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#188038] cursor-pointer font-tamil ${padding} ${
          language === 'ta'
            ? 'bg-[#188038] text-white shadow-xs'
            : 'text-[#5F6368] hover:text-[#202124]'
        }`}
      >
        தமிழ்
      </button>
    </div>
  );
}
