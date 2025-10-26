'use client';

import { useMemo } from 'react';
import { useTranslations } from '@/contexts/LanguageContext';
import { mapEnglishToLocalized, getDefaultAisleColor } from '@/types/shoppingList';
import { normalizeHexColor, getContrastingTextColor, getBorderColorFromHex } from '@/utils/colors';

export default function TopPurchasedItems({
  items = [],
  loading = false,
  onAddItem,
  customAisles = [],
  existingItemNames = [],
  onClose,
  aisleColors = {}
}) {
  const t = useTranslations();

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
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg transition-colors duration-200">
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
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

      <div className="px-4 py-3">
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

              return item.isInCurrentList ? (
                <div
                  key={item.item_name}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/20 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                      {item.item_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>{t('topItems.purchasedCount', { count: item.purchase_count })}</span>
                      {item.displayAisle && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full border border-transparent font-medium"
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
                  </div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    {t('topItems.alreadyAdded')}
                  </span>
                </div>
              ) : (
                <button
                  key={item.item_name}
                  onClick={() => onAddItem?.(item)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 hover:border-indigo-200 dark:hover:border-indigo-400/60 hover:bg-white dark:hover:bg-slate-900 transition-colors duration-200 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                      {item.item_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>{t('topItems.purchasedCount', { count: item.purchase_count })}</span>
                      {item.displayAisle && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full border border-transparent font-medium"
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
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wide">
                    {t('topItems.addButton')}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
