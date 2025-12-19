'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from '@/contexts/LanguageContext';
import { mapEnglishToLocalized, getDefaultAisleColor } from '@/types/shoppingList';
import { normalizeHexColor, getContrastingTextColor, getBorderColorFromHex } from '@/utils/colors';

export default function TopPurchasedItems({
  items = [],
  loading = false,
  onAddItem,
  onDeleteItem,
  customAisles = [],
  existingItemNames = [],
  onClose,
  aisleColors = {}
}) {
  const t = useTranslations();
  const [openMenuId, setOpenMenuId] = useState(null);

  const existingItemsSet = useMemo(() => {
    return new Set(
      existingItemNames
        .filter(Boolean)
        .map((name) => name.trim().toLowerCase())
    );
  }, [existingItemNames]);

  const normalizedItems = useMemo(() => {
    return items
      .filter((item) => item && item.item_name) // Filter out invalid items
      .map((item) => {
        const localizedAisle = item.last_aisle
          ? mapEnglishToLocalized([item.last_aisle], t)[0]
          : null;

        const fallbackAisle =
          !item.last_aisle && customAisles.length > 0 ? customAisles[0] : null;

        const displayAisle = localizedAisle || fallbackAisle;
        const colorFromMap = displayAisle ? aisleColors[displayAisle] : null;
        const defaultColor = item.last_aisle ? getDefaultAisleColor(item.last_aisle) : null;
        const displayColor = normalizeHexColor(colorFromMap) || defaultColor || '#6b7280';

        return {
          ...item,
          displayAisle,
          displayColor,
          isInCurrentList: existingItemsSet.has(item.item_name.trim().toLowerCase()),
        };
      });
  }, [items, customAisles, aisleColors, t, existingItemsSet]);

  const hasItems = normalizedItems.length > 0;
  const showFullSpinner = loading && !hasItems;

  return (
    <section className="h-full flex flex-col bg-white dark:bg-slate-900 transition-colors duration-200">
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('topItems.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('topItems.subtitle')}
          </p>
        </div>
        {loading && hasItems && (
          <div className="mr-3 mt-0.5">
            <span className="inline-flex items-center text-xs font-medium text-slate-400 dark:text-slate-500">
              <svg className="animate-spin h-4 w-4 mr-1 text-indigo-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {t('topItems.refreshing')}
            </span>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 transition-colors duration-200"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {showFullSpinner ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : normalizedItems.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('topItems.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {normalizedItems.map((item) => {
              const badgeColor = normalizeHexColor(item.displayColor) || '#6b7280';
              const badgeTextColor = getContrastingTextColor(badgeColor, {
                light: '#f9fafb',
                dark: '#111827'
              });
              const badgeBorderColor = getBorderColorFromHex(badgeColor, 0.45) || 'rgba(107,114,128,0.45)';

              const isMenuOpen = openMenuId === item.item_name;

              return (
                <div
                  key={item.item_name}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-200"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                      {item.item_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span>{t('topItems.purchasedCount', { count: item.purchase_count })}</span>
                    </div>
                    {item.displayAisle && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full border border-transparent font-medium text-xs mt-1"
                        style={{
                          backgroundColor: badgeColor,
                          color: badgeTextColor,
                          borderColor: badgeBorderColor
                        }}
                      >
                        {item.displayAisle}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.isInCurrentList ? (
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {t('topItems.alreadyAdded')}
                      </span>
                    ) : (
                      <button
                        onClick={() => onAddItem?.(item)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wide hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
                      >
                        {t('topItems.addButton')}
                      </button>
                    )}

                    {/* Kebab menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(isMenuOpen ? null : item.item_name)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label={t('topItems.menuButton')}
                      >
                        <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>

                      {isMenuOpen && (
                        <>
                          {/* Backdrop to close menu */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />

                          {/* Menu dropdown */}
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-20">
                            {!item.isInCurrentList && (
                              <button
                                onClick={() => {
                                  onAddItem?.(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 rounded-t-lg"
                              >
                                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>{t('topItems.addButton')}</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                onDeleteItem?.(item.item_name);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center gap-3 rounded-b-lg"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>{t('topItems.deleteFromHistory')}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
