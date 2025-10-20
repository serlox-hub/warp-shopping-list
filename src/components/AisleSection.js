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
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {sectionColor && (
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full border border-slate-200 dark:border-slate-700"
              style={{ backgroundColor: sectionColor }}
              aria-hidden="true"
            ></span>
          )}
          <AisleName aisle={aisle} />
        </h3>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('shoppingList.aisleProgress', { completed: completedCount, total: totalCount })}
        </span>
      </div>
      
      <div className="space-y-3">
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
    </section>
  );
}
