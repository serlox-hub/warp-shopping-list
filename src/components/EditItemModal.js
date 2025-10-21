'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DEFAULT_AISLES } from '@/types/shoppingList';
import { useTranslations } from '@/contexts/LanguageContext';

export default function EditItemModal({
  item,
  onUpdateItem,
  onClose,
  customAisles = DEFAULT_AISLES
}) {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState('Other');
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState('');

  const englishToLocalized = useMemo(() => ({
    Produce: t('aisles.produce'),
    Dairy: t('aisles.dairy'),
    'Meat & Seafood': t('aisles.meatSeafood'),
    Bakery: t('aisles.bakery'),
    Pantry: t('aisles.pantry'),
    Frozen: t('aisles.frozen'),
    'Personal Care': t('aisles.personalCare'),
    Household: t('aisles.household'),
    Other: t('aisles.other')
  }), [t]);

  const localizedToEnglish = useMemo(() => {
    const map = {};
    Object.entries(englishToLocalized).forEach(([english, localized]) => {
      if (localized) {
        map[localized] = english;
      }
    });
    return map;
  }, [englishToLocalized]);

  const getDefaultLocalizedAisle = useCallback(() => {
    const localizedOther = englishToLocalized.Other;
    if (localizedOther && customAisles.includes(localizedOther)) {
      return localizedOther;
    }
    return customAisles[0] || '';
  }, [customAisles, englishToLocalized]);

  // Initialize form with item data
  useEffect(() => {
    if (item) {
      setName(item.name || '');
      // Find the localized aisle name that matches the stored English aisle
      const matchingLocalizedAisle = customAisles.find(
        (localizedAisle) => localizedToEnglish[localizedAisle] === item.aisle
      );

      setAisle(
        matchingLocalizedAisle ||
          englishToLocalized[item.aisle] ||
          item.aisle ||
          getDefaultLocalizedAisle()
      );
      setQuantity(item.quantity || 1);
      setComment(item.comment || '');
    }
  }, [item, customAisles, englishToLocalized, localizedToEnglish, getDefaultLocalizedAisle]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const aisleTranslationMap = {
      ...localizedToEnglish
    };
    const englishAisle = aisleTranslationMap[aisle] || aisle;

    onUpdateItem({
      ...item,
      name: name.trim(),
      aisle: englishAisle,
      quantity: parseInt(quantity, 10),
      comment: comment.trim()
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-2';
  const controlClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors duration-200';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-indigo-500 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('addItemForm.editTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4">
            {/* Item Name */}
            <div>
              <label className={labelClass}>
                {t('addItemForm.itemName')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('addItemForm.itemNamePlaceholder')}
                className={controlClass}
                required
                autoFocus
              />
            </div>

            {/* Aisle and Quantity Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  {t('addItemForm.aisle')}
                </label>
                <select
                  value={aisle}
                  onChange={(e) => setAisle(e.target.value)}
                  className={controlClass}
                >
                  {customAisles.map((aisleOption) => (
                    <option key={aisleOption} value={aisleOption}>
                      {aisleOption}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  {t('addItemForm.quantity')}
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className={controlClass}
                />
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className={labelClass}>
                {t('addItemForm.comment')}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('addItemForm.commentPlaceholder')}
                rows={3}
                className={`${controlClass} resize-none`}
                maxLength={200}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('addItemForm.commentHelper')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {comment.length}/200
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {t('addItemForm.updateButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
