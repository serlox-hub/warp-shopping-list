'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from '@/contexts/LanguageContext';

export default function ShoppingItem({
  item,
  onToggleComplete,
  onDelete,
  onEdit,
  availableAisles = [],
  onChangeAisle,
  aisleColors = {}
}) {
  const t = useTranslations();
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenu) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const aisleTranslationMap = useMemo(() => ({
    Produce: 'aisles.produce',
    Dairy: 'aisles.dairy',
    'Meat & Seafood': 'aisles.meatSeafood',
    Bakery: 'aisles.bakery',
    Pantry: 'aisles.pantry',
    Frozen: 'aisles.frozen',
    'Personal Care': 'aisles.personalCare',
    Household: 'aisles.household',
    Other: 'aisles.other'
  }), []);

  const handleToggle = () => {
    onToggleComplete?.(item.id);
  };

  const toggleMenu = (event, menu) => {
    event?.stopPropagation();
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const handleEdit = (event) => {
    event?.stopPropagation();
    setOpenMenu(null);
    onEdit?.(item);
  };

  const handleDelete = (event) => {
    event?.stopPropagation();
    setOpenMenu(null);
    onDelete?.(item.id);
  };

  const handleSelectAisle = (event, selectedAisle) => {
    event?.stopPropagation();
    setOpenMenu(null);
    if (!selectedAisle || selectedAisle === item.aisle) return;
    onChangeAisle?.(item.id, selectedAisle);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  const getAisleLabel = (aisle) => {
    if (!aisle) return '';
    const translationKey = aisleTranslationMap[aisle];
    return translationKey ? t(translationKey) : aisle;
  };

  const getAisleColor = (aisle) => {
    if (!aisle) return null;
    return aisleColors[aisle] || null;
  };

  const canChangeAisle = availableAisles.length > 0;

  return (
    <div
      className={`p-4 border rounded-xl transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
        item.completed
          ? 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 opacity-80'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-400/60 hover:shadow-sm'
      }`}
      role="button"
      tabIndex={0}
      aria-pressed={item.completed}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer select-none">
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
              <svg className="w-3 h-3 inline mr-1 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {item.comment.trim()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-3" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={(event) => toggleMenu(event, 'aisle')}
              className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                canChangeAisle
                  ? 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'aisle'}
              aria-label={t('shoppingList.changeAisle')}
              disabled={!canChangeAisle}
            >
              <span className="sr-only">{t('shoppingList.changeAisle')}</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 5a3 3 0 013-3h6.172a3 3 0 012.121.879l6.828 6.828a3 3 0 010 4.242l-7.172 7.172a3 3 0 01-4.242 0L3.879 14.707A3 3 0 013 12.586V5zm3-1h6.172a1 1 0 01.707.293l6.828 6.828a1 1 0 010 1.414l-7.172 7.172a1 1 0 01-1.414 0l-6.828-6.828A1 1 0 014 12.586V5a1 1 0 011-1z" />
                <circle cx="9" cy="8" r="1.4" opacity="0.45" />
              </svg>
            </button>
            {openMenu === 'aisle' && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 py-2"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('shoppingList.currentAisle')}
                </div>
                <div className="px-3 pb-2 text-sm text-gray-700 dark:text-gray-200">
                  {getAisleLabel(item.aisle)}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <div className="max-h-60 overflow-y-auto">
                  {availableAisles.map((aisle) => {
                    const label = getAisleLabel(aisle);
                    const isCurrent = aisle === item.aisle;
                    const aisleColor = getAisleColor(aisle);
                    return (
                      <button
                        key={aisle}
                        type="button"
                        onClick={(event) => handleSelectAisle(event, aisle)}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 flex items-center gap-2 ${
                          isCurrent
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                        }`}
                        aria-current={isCurrent ? 'true' : undefined}
                      >
                        {aisleColor && (
                          <span
                            className="inline-flex h-2.5 w-2.5 rounded-full border border-gray-200 dark:border-gray-700"
                            style={{ backgroundColor: aisleColor }}
                            aria-hidden="true"
                          ></span>
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={(event) => toggleMenu(event, 'actions')}
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-haspopup="menu"
              aria-expanded={openMenu === 'actions'}
              aria-label={t('shoppingList.itemActions')}
            >
              <span className="sr-only">{t('shoppingList.itemActions')}</span>
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
              </svg>
            </button>
            {openMenu === 'actions' && (
              <div
                className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 py-1"
                onClick={(event) => event.stopPropagation()}
              >
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
