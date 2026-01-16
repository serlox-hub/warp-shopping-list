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
  aisleColors = {},
  availableSupermarkets = [],
  onChangeSupermarket
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
    const currentAisleName = item.aisle?.name || item.aisle;
    if (!selectedAisle || selectedAisle === currentAisleName) return;
    onChangeAisle?.(item.id, selectedAisle);
  };

  const handleSelectSupermarket = (event, selectedSupermarketId) => {
    event?.stopPropagation();
    setOpenMenu(null);
    const currentSupermarketId = item.supermarket_id || item.supermarket?.id;
    if (selectedSupermarketId === currentSupermarketId) return;
    onChangeSupermarket?.(item.id, selectedSupermarketId);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  const getAisleLabel = (aisle) => {
    if (!aisle) return '';
    // Handle both string and object aisle
    const aisleName = typeof aisle === 'string' ? aisle : aisle.name;
    const translationKey = aisleTranslationMap[aisleName];
    return translationKey ? t(translationKey) : aisleName;
  };

  const getAisleColor = (aisle) => {
    if (!aisle) return null;
    // Handle both string and object aisle
    const aisleName = typeof aisle === 'string' ? aisle : aisle.name;
    // First try from item's aisle object (if it has color), then fallback to aisleColors prop
    if (typeof aisle === 'object' && aisle.color) return aisle.color;
    return aisleColors[aisleName] || null;
  };

  const canChangeAisle = availableAisles.length > 0;
  const canChangeSupermarket = availableSupermarkets.length > 0;
  const currentSupermarketId = item.supermarket_id || item.supermarket?.id;

  return (
    <div
      className={`px-4 py-2.5 border rounded-lg transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
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
      <div className={`flex justify-between ${item.comment && item.comment.trim() ? 'items-start' : 'items-center'}`}>
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
              onClick={(event) => toggleMenu(event, 'actions')}
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-haspopup="menu"
              aria-expanded={openMenu === 'actions' || openMenu === 'aisle' || openMenu === 'supermarket'}
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
                {canChangeAisle && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenu('aisle');
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors duration-150 flex items-center justify-between"
                  >
                    <span>{t('shoppingList.changeAisle')}</span>
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                {canChangeSupermarket && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenu('supermarket');
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors duration-150 flex items-center justify-between"
                  >
                    <span>{t('shoppingList.changeSupermarket')}</span>
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors duration-150"
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
            {openMenu === 'aisle' && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 py-1"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenu('actions');
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                  <span>{t('shoppingList.changeAisle')}</span>
                </button>
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
            {openMenu === 'supermarket' && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 py-1"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenu('actions');
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                  <span>{t('shoppingList.changeSupermarket')}</span>
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <div className="max-h-60 overflow-y-auto">
                  {/* Option to remove supermarket assignment */}
                  <button
                    type="button"
                    onClick={(event) => handleSelectSupermarket(event, null)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 flex items-center gap-2 ${
                      !currentSupermarketId
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                    }`}
                    aria-current={!currentSupermarketId ? 'true' : undefined}
                  >
                    <span className="inline-flex h-2.5 w-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                    <span>{t('shoppingList.noSupermarket')}</span>
                  </button>
                  {availableSupermarkets.map((supermarket) => {
                    const isCurrent = supermarket.id === currentSupermarketId;
                    return (
                      <button
                        key={supermarket.id}
                        type="button"
                        onClick={(event) => handleSelectSupermarket(event, supermarket.id)}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 flex items-center gap-2 ${
                          isCurrent
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                        }`}
                        aria-current={isCurrent ? 'true' : undefined}
                      >
                        <span
                          className="inline-flex h-2.5 w-2.5 rounded-full border border-gray-200 dark:border-gray-700"
                          style={{ backgroundColor: supermarket.color }}
                          aria-hidden="true"
                        ></span>
                        <span>{supermarket.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
