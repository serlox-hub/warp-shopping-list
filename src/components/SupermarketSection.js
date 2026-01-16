'use client';

import { useState } from 'react';
import AisleSection from './AisleSection';
import { groupItemsByAisle, sortItemsInAisle } from '@/types/shoppingList';
import { useTranslations } from '@/contexts/LanguageContext';
import { getContrastingTextColor } from '@/utils/colors';

export default function SupermarketSection({
  supermarket,
  items,
  customAisles = [],
  aisleColors = {},
  onToggleComplete,
  onDelete,
  onEdit,
  availableAisles = [],
  onChangeAisle,
  availableSupermarkets = [],
  onChangeSupermarket,
  defaultExpanded = true
}) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Group items by aisle within this supermarket
  const groupedByAisle = groupItemsByAisle(items, customAisles);

  // Calculate progress
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const supermarketColor = supermarket?.color || '#6b7280';
  const textColor = getContrastingTextColor(supermarketColor, { light: '#f9fafb', dark: '#111827' });

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Supermarket Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 transition-colors duration-200 hover:opacity-90 ${isExpanded ? 'rounded-t-xl' : 'rounded-xl'}`}
        style={{ backgroundColor: supermarketColor }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            style={{ color: textColor }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-lg font-semibold" style={{ color: textColor }}>
            {supermarket?.name || t('supermarket.unassigned')}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-medium"
            style={{ color: textColor, opacity: 0.9 }}
          >
            {t('shoppingList.aisleProgress', { completed: completedCount, total: totalCount })}
          </span>
          {progressPercent === 100 && totalCount > 0 && (
            <svg
              className="w-5 h-5"
              style={{ color: textColor }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </button>

      {/* Supermarket Content */}
      {isExpanded && (
        <div className="p-4 pb-6 space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
          {Object.entries(groupedByAisle).map(([aisle, aisleItems]) => (
            <AisleSection
              key={aisle}
              aisle={aisle}
              items={aisleItems}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onEdit={onEdit}
              aisleColors={aisleColors}
              availableAisles={availableAisles}
              onChangeAisle={onChangeAisle}
              availableSupermarkets={availableSupermarkets}
              onChangeSupermarket={onChangeSupermarket}
            />
          ))}
          {Object.keys(groupedByAisle).length === 0 && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
              {t('supermarket.noItems')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
