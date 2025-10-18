'use client';

import ShoppingItem from './ShoppingItem';
import AisleName from './AisleName';
import { sortItemsInAisle } from '@/types/shoppingList';
import { useTranslations } from '@/contexts/LanguageContext';

export default function AisleSection({
  aisle,
  items,
  onToggleComplete,
  onDelete,
  onEdit,
  aisleColors = {}
}) {
  const t = useTranslations();
  const sortedItems = sortItemsInAisle([...items]);
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const sectionColor = aisleColors[aisle];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          {sectionColor && (
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: sectionColor }}
              aria-hidden="true"
            ></span>
          )}
          <AisleName aisle={aisle} />
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('shoppingList.aisleProgress', { completed: completedCount, total: totalCount })}
        </span>
      </div>
      
      <div className="space-y-2">
        {sortedItems.map(item => (
          <ShoppingItem
            key={item.id}
            item={item}
            aisleColor={aisleColors[item.aisle]}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
