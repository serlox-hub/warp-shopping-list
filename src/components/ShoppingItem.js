'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from '@/contexts/LanguageContext';
import { normalizeHexColor, getContrastingTextColor, getBorderColorFromHex } from '@/utils/colors';
import AisleName from './AisleName';

const FALLBACK_BADGE_COLOR = '#e5e7eb';
const FALLBACK_TEXT_DARK = '#111827';

export default function ShoppingItem({ item, onToggleComplete, onDelete, onEdit, aisleColor }) {
  const t = useTranslations();
  const normalizedColor = normalizeHexColor(aisleColor) || FALLBACK_BADGE_COLOR;
  const badgeColor = normalizedColor;
  const badgeTextColor = getContrastingTextColor(badgeColor, {
    light: '#f9fafb',
    dark: FALLBACK_TEXT_DARK
  });
  const badgeBorderColor = getBorderColorFromHex(badgeColor, 0.45) || 'rgba(107, 114, 128, 0.45)';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleEdit = () => {
    setIsMenuOpen(false);
    onEdit?.(item);
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    onDelete?.(item.id);
  };

  return (
    <div className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-200 ${
      item.completed ? 'bg-gray-50 dark:bg-gray-800 opacity-75' : 'bg-white dark:bg-gray-800'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onToggleComplete(item.id)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
          />
          <div className="flex-1">
            <div className={item.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
              <span className="font-medium">{item.name}</span>
              {item.quantity > 1 && (
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({item.quantity})</span>
              )}
            </div>
            {item.comment && item.comment.trim() && (
              <div className={`mt-1 text-sm ${
                item.completed 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <svg className="w-3 h-3 inline mr-1 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {item.comment.trim()}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span
            className="text-xs px-2 py-1 rounded font-medium border border-transparent"
            style={{
              backgroundColor: badgeColor,
              color: badgeTextColor,
              borderColor: badgeBorderColor
            }}
          >
            <AisleName aisle={item.aisle} />
          </span>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={toggleMenu}
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label={t('shoppingList.itemActions')}
            >
              <span className="sr-only">{t('shoppingList.itemActions')}</span>
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
              </svg>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 py-1">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors duration-150"
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
