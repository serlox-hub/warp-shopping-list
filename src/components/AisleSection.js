'use client';

import ShoppingItem from './ShoppingItem';
import { sortItemsInAisle } from '@/types/shoppingList';

export default function AisleSection({ aisle, items, onToggleComplete, onDelete, onEdit }) {
  const sortedItems = sortItemsInAisle([...items]);
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{aisle}</h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {completedCount}/{totalCount} completed
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