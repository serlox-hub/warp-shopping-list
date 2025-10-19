'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DEFAULT_AISLES, getDefaultAisleColor } from '@/types/shoppingList';
import { useTranslations } from '@/contexts/LanguageContext';
import { normalizeHexColor, getContrastingTextColor, getBorderColorFromHex } from '@/utils/colors';

const normalizeText = (value) => value?.trim().toLowerCase() || '';

const isSubsequence = (query, target) => {
  let queryIndex = 0;
  for (let i = 0; i < target.length && queryIndex < query.length; i += 1) {
    if (target[i] === query[queryIndex]) {
      queryIndex += 1;
    }
  }
  return queryIndex === query.length;
};

const buildHighlightSegments = (originalName, query, matchType) => {
  const safeName = originalName ?? '';
  const safeQuery = query ?? '';

  if (!safeName) {
    return [];
  }

  const lowerName = safeName.toLowerCase();
  const lowerQuery = safeQuery.toLowerCase();

  if (!safeQuery || lowerQuery.length === 0) {
    return [{ text: safeName, match: false }];
  }

  if (matchType === 'exact') {
    return [{ text: safeName, match: true }];
  }

  if (matchType === 'partial') {
    const start = lowerName.indexOf(lowerQuery);
    if (start === -1) {
      return [{ text: safeName, match: false }];
    }
    const end = start + lowerQuery.length;
    const segments = [];
    if (start > 0) {
      segments.push({ text: safeName.slice(0, start), match: false });
    }
    segments.push({ text: safeName.slice(start, end), match: true });
    if (end < safeName.length) {
      segments.push({ text: safeName.slice(end), match: false });
    }
    return segments;
  }

  if (matchType === 'fuzzy') {
    const segments = [];
    let currentSegment = '';
    let currentMatch = false;
    const flush = () => {
      if (!currentSegment) return;
      segments.push({ text: currentSegment, match: currentMatch });
      currentSegment = '';
    };
    let queryIndex = 0;
    for (let i = 0; i < safeName.length; i += 1) {
      const char = safeName[i];
      const lowerChar = lowerName[i];
      const isMatchChar = queryIndex < lowerQuery.length && lowerChar === lowerQuery[queryIndex];
      if (isMatchChar) {
        if (!currentMatch) {
          flush();
          currentMatch = true;
        }
        currentSegment += char;
        queryIndex += 1;
      } else {
        if (currentMatch) {
          flush();
          currentMatch = false;
        }
        currentSegment += char;
      }
    }
    flush();
    if (segments.length === 0) {
      return [{ text: safeName, match: false }];
    }
    return segments;
  }

  return [{ text: safeName, match: false }];
};

const MAX_SUGGESTIONS = 20;

export default function AddItemForm({
  onAddItem,
  editingItem,
  onUpdateItem,
  onCancelEdit,
  customAisles = DEFAULT_AISLES,
  itemUsageHistory = [],
  existingItemNames = [],
  existingItems = [],
  aisleColors = {}
}) {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState('Other');
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionCloseTimeout = useRef(null);

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

  const existingItemsSet = useMemo(() => {
    const set = new Set();

    (existingItems || [])
      .filter((entry) => entry && entry.name)
      .forEach((entry) => {
        const key = `${normalizeText(entry.name)}::${normalizeText(entry.aisle)}`;
        set.add(key);
      });

    return set;
  }, [existingItems]);

  const normalizedUsageHistory = useMemo(() => {
    const unique = new Map();
    itemUsageHistory.forEach((entry) => {
      const usageKey =
        entry?.usage_key ||
        `${normalizeText(entry?.item_name)}::${normalizeText(entry?.usage_aisle || entry?.last_aisle || '')}`;
      if (!usageKey || unique.has(usageKey)) return;
      unique.set(usageKey, entry);
    });
    return Array.from(unique.values());
  }, [itemUsageHistory]);

  const computeSuggestions = useCallback((rawQuery) => {
    const trimmedQuery = rawQuery?.trim() || '';
    const normalizedQuery = normalizeText(rawQuery);
    if (normalizedQuery.length < 3) return [];

    const exactMatches = [];
    const partialMatches = [];
    const fuzzyMatches = [];

    normalizedUsageHistory.forEach((entry) => {
      const originalName = entry?.item_name?.trim();
      if (!originalName) return;
      const normalizedName = normalizeText(originalName);
      if (!normalizedName) return;

      if (normalizedName === normalizedQuery) {
        exactMatches.push(entry);
      } else if (normalizedName.includes(normalizedQuery)) {
        partialMatches.push(entry);
      } else if (isSubsequence(normalizedQuery, normalizedName)) {
        fuzzyMatches.push(entry);
      }
    });

    const seen = new Set();
    const rankedSuggestions = [];
    const sortByUsage = (a, b) => {
      const usageDiff = (b?.purchase_count || 0) - (a?.purchase_count || 0);
      if (usageDiff !== 0) return usageDiff;
      return (a?.item_name || '').localeCompare(b?.item_name || '');
    };

    const pushGroup = (group, type) => {
      group.sort(sortByUsage).some((entry) => {
        const originalName = entry?.item_name?.trim() || '';
        if (!originalName) {
          return false;
        }
        const englishAisle = entry?.usage_aisle?.trim() || entry?.last_aisle?.trim() || null;
        const usageKey =
          entry?.usage_key ||
          `${normalizeText(originalName)}::${normalizeText(englishAisle)}`;
        if (!usageKey || seen.has(usageKey)) {
          return false;
        }
        seen.add(usageKey);
        const inListKey = `${normalizeText(originalName)}::${normalizeText(englishAisle)}`;
        const isInCurrentList = existingItemsSet.has(inListKey);
        const localizedAisle = englishAisle
          ? englishToLocalized[englishAisle] || englishAisle
          : null;
        const normalizedColor = localizedAisle
          ? normalizeHexColor(aisleColors[localizedAisle]) || getDefaultAisleColor(englishAisle)
          : getDefaultAisleColor(englishAisle);
        const badgeBackground = normalizedColor || '#9ca3af';
        const badgeTextColor = getContrastingTextColor(badgeBackground, {
          light: '#f9fafb',
          dark: '#111827'
        });
        const badgeBorderColor = getBorderColorFromHex(badgeBackground, 0.45) || 'rgba(107,114,128,0.45)';
        const highlightSegments = buildHighlightSegments(originalName, trimmedQuery, type);
        rankedSuggestions.push({
          ...entry,
          usageKey,
          item_name: originalName,
          matchType: type,
          isInCurrentList,
          displayAisle: localizedAisle,
          badgeBackground,
          badgeTextColor,
          badgeBorderColor,
          highlightSegments: highlightSegments.length > 0
            ? highlightSegments
            : [{ text: originalName, match: false }]
        });
        return rankedSuggestions.length >= MAX_SUGGESTIONS;
      });
    };

    pushGroup(exactMatches, 'exact');
    if (rankedSuggestions.length < MAX_SUGGESTIONS) {
      pushGroup(partialMatches, 'partial');
    }
    if (rankedSuggestions.length < MAX_SUGGESTIONS) {
      pushGroup(fuzzyMatches, 'fuzzy');
    }

    return rankedSuggestions.slice(0, MAX_SUGGESTIONS);
  }, [normalizedUsageHistory, existingItemsSet, englishToLocalized, aisleColors]);

  // Update form values when editingItem changes
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '');
      // Find the localized aisle name that matches the stored English aisle
      const matchingLocalizedAisle = customAisles.find(
        (localizedAisle) => localizedToEnglish[localizedAisle] === editingItem.aisle
      );

      setAisle(
        matchingLocalizedAisle ||
          englishToLocalized[editingItem.aisle] ||
          editingItem.aisle ||
          (customAisles.includes(englishToLocalized.Other)
            ? englishToLocalized.Other
            : customAisles[0] || '')
      );
      setQuantity(editingItem.quantity || 1);
      setComment(editingItem.comment || '');
    } else {
      setName('');
      setAisle(
        customAisles.includes(englishToLocalized.Other)
          ? englishToLocalized.Other
          : customAisles[0] || ''
      );
      setQuantity(1);
      setComment('');
    }
    setSuggestions([]);
    setShowSuggestions(false);
  }, [editingItem, customAisles, englishToLocalized, localizedToEnglish]);

  useEffect(() => {
    return () => {
      if (suggestionCloseTimeout.current) {
        clearTimeout(suggestionCloseTimeout.current);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const aisleTranslationMap = {
      ...localizedToEnglish
    };
    const englishAisle = aisleTranslationMap[aisle] || aisle;

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        name: name.trim(),
        aisle: englishAisle,
        quantity: parseInt(quantity, 10),
        comment: comment.trim()
      });
    } else {
      onAddItem({
        name: name.trim(),
        aisle: englishAisle,
        quantity: parseInt(quantity, 10),
        comment: comment.trim()
      });
    }

    if (!editingItem) {
      setName('');
      setAisle(
        customAisles.includes(englishToLocalized.Other)
          ? englishToLocalized.Other
          : customAisles[0] || ''
      );
      setQuantity(1);
      setComment('');
    }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleCancel = () => {
    if (editingItem) {
      onCancelEdit();
    }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleNameChange = (value) => {
    setName(value);
    const newSuggestions = computeSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleSuggestionSelection = (suggestion) => {
    setName(suggestion.item_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
    if (suggestionCloseTimeout.current) {
      clearTimeout(suggestionCloseTimeout.current);
      suggestionCloseTimeout.current = null;
    }
  };

  const handleInputBlur = () => {
    suggestionCloseTimeout.current = setTimeout(() => {
      setShowSuggestions(false);
    }, 120);
  };

  const isEditing = !!editingItem;

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-4 rounded-lg border shadow-sm transition-colors duration-200 ${
        isEditing
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center space-x-2 mb-4">
        {isEditing && (
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
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
        )}
        <h3
          className={`text-lg font-semibold ${
            isEditing
              ? 'text-blue-800 dark:text-blue-200'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {editingItem ? t('addItemForm.editTitle') : t('addItemForm.addTitle')}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            className={`block text-sm font-medium mb-1 ${
              isEditing
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('addItemForm.itemName')}
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={t('addItemForm.itemNamePlaceholder')}
              className={`w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200 ${
                isEditing
                  ? 'border-blue-300 dark:border-blue-600 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
              }`}
              required
              autoComplete="off"
            />
            {showSuggestions && (
              <div
                data-testid="item-suggestions"
                className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.usageKey || suggestion.item_name}
                    type="button"
                    data-testid="suggestion-item"
                    data-in-list={suggestion.isInCurrentList ? 'true' : 'false'}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelection(suggestion)}
                    className={`w-full px-3 py-2 text-left transition-colors duration-150 flex items-center justify-between gap-3 ${
                      suggestion.isInCurrentList
                        ? 'opacity-60 cursor-pointer'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {suggestion.highlightSegments?.length
                          ? suggestion.highlightSegments.map((segment, index) =>
                              segment.match ? (
                                <mark
                                  key={`${suggestion.item_name}-${index}-match`}
                                  data-testid="highlight-segment-match"
                                  className="rounded-sm bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 px-0.5"
                                >
                                  {segment.text}
                                </mark>
                              ) : (
                                <span key={`${suggestion.item_name}-${index}-plain`}>
                                  {segment.text}
                                </span>
                              )
                            )
                          : suggestion.item_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        {suggestion.displayAisle && (
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-0.5 font-medium"
                            style={{
                              backgroundColor: suggestion.badgeBackground,
                              color: suggestion.badgeTextColor,
                              borderColor: suggestion.badgeBorderColor
                            }}
                          >
                            {suggestion.displayAisle}
                          </span>
                        )}
                      </div>
                    </div>
                    {suggestion.isInCurrentList && (
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t('topItems.alreadyAdded')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-1 ${
              isEditing
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('addItemForm.aisle')}
          </label>
          <select
            value={aisle}
            onChange={(e) => setAisle(e.target.value)}
            className={`w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 text-gray-900 dark:text-gray-100 transition-colors duration-200 ${
              isEditing
                ? 'border-blue-300 dark:border-blue-600 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
            }`}
          >
            {customAisles.map((aisleOption) => (
              <option key={aisleOption} value={aisleOption}>
                {aisleOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-1 ${
              isEditing
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('addItemForm.quantity')}
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className={`w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 text-gray-900 dark:text-gray-100 transition-colors duration-200 ${
              isEditing
                ? 'border-blue-300 dark:border-blue-600 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
            }`}
          />
        </div>
      </div>

      <div className="mt-4">
        <label
          className={`block text-sm font-medium mb-1 ${
            isEditing
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {t('addItemForm.comment')}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('addItemForm.commentPlaceholder')}
          rows={2}
          className={`w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200 resize-none ${
            isEditing
              ? 'border-blue-300 dark:border-blue-600 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
          }`}
          maxLength={200}
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('addItemForm.commentHelper')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {comment.length}/200
          </span>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        {editingItem && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            {t('common.cancel')}
          </button>
        )}
        <button
          type="submit"
          className={`px-4 py-2 text-white rounded-md transition-colors duration-200 font-medium ${
            isEditing
              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {editingItem ? t('addItemForm.updateButton') : t('addItemForm.addButton')}
        </button>
      </div>
    </form>
  );
}
