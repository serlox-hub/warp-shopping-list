'use client';

import { useMemo } from 'react';
import { useTranslations } from '@/contexts/LanguageContext';
import { mapEnglishToLocalized } from '@/types/shoppingList';

export default function TopPurchasedItems({
  items = [],
  loading = false,
  onAddItem,
  customAisles = [],
  existingItemNames = [],
  onClose,
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
    return items.map((item) => {
      const localizedAisle = item.last_aisle
        ? mapEnglishToLocalized([item.last_aisle], t)[0]
        : null;

      const fallbackAisle =
        !item.last_aisle && customAisles.length > 0 ? customAisles[0] : null;

      return {
        ...item,
        displayAisle: localizedAisle || fallbackAisle,
        isInCurrentList: existingItemsSet.has(item.item_name.trim().toLowerCase()),
      };
    });
  }, [items, customAisles, t, existingItemsSet]);

  const hasItems = normalizedItems.length > 0;
  const showFullSpinner = loading && !hasItems;

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-colors duration-200">
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('topItems.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('topItems.subtitle')}
          </p>
        </div>
        {loading && hasItems && (
          <div className="mr-3 mt-0.5">
            <span className="inline-flex items-center text-xs font-medium text-gray-400 dark:text-gray-500">
              <svg className="animate-spin h-4 w-4 mr-1 text-blue-500" viewBox="0 0 24 24">
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
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
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
          <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('topItems.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {normalizedItems.map((item) =>
              item.isInCurrentList ? (
                <div
                  key={item.item_name}
                  className="flex items-center justify-between p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/10 text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                      {item.item_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('topItems.purchasedCount', { count: item.purchase_count })}
                      {item.displayAisle ? ` • ${item.displayAisle}` : ''}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {t('topItems.alreadyAdded')}
                  </span>
                </div>
              ) : (
                <button
                  key={item.item_name}
                  onClick={() => onAddItem?.(item)}
                  className="flex items-center justify-between p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-900 transition-colors duration-200 text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                      {item.item_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('topItems.purchasedCount', { count: item.purchase_count })}
                      {item.displayAisle ? ` • ${item.displayAisle}` : ''}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    {t('topItems.addButton')}
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
