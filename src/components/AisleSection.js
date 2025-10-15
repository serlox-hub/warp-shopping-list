'use client';

import ShoppingItem from './ShoppingItem';
import AisleName from './AisleName';
import { sortItemsInAisle } from '@/types/shoppingList';
import { useTranslations } from '@/contexts/LanguageContext';

export default function AisleSection({ aisle, items, onToggleComplete, onDelete, onEdit }) {
  const t = useTranslations();
  const sortedItems = sortItemsInAisle([...items]);
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
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
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}