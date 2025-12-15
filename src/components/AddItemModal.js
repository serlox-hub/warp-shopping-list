'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DEFAULT_AISLES, getDefaultAisleColor } from '@/types/shoppingList';
import { useTranslations } from '@/contexts/LanguageContext';
import { normalizeHexColor, getContrastingTextColor, getBorderColorFromHex } from '@/utils/colors';

const stripDiacritics = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return stripDiacritics(String(value)).trim().toLowerCase();
};

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

  const { originalChars, accentlessName, accentlessPositions } = (() => {
    const chars = Array.from(safeName);
    let accentless = '';
    const positions = [];

    chars.forEach((char, index) => {
      const accentlessChar = stripDiacritics(char);
      if (!accentlessChar) return;
      accentless += accentlessChar;
      for (let i = 0; i < accentlessChar.length; i += 1) {
        positions.push(index);
      }
    });

    return { originalChars: chars, accentlessName: accentless, accentlessPositions: positions };
  })();

  const normalizedQuery = stripDiacritics(safeQuery).toLowerCase();

  if (!safeQuery || normalizedQuery.length === 0) {
    return [{ text: safeName, match: false }];
  }

  if (matchType === 'exact') {
    return [{ text: safeName, match: true }];
  }

  const markPositions = new Set();

  if (matchType === 'partial') {
    const lowerAccentlessName = accentlessName.toLowerCase();
    const start = lowerAccentlessName.indexOf(normalizedQuery);
    if (start === -1) {
      return [{ text: safeName, match: false }];
    }
    for (let i = start; i < start + normalizedQuery.length; i += 1) {
      const originalIndex = accentlessPositions[i];
      if (originalIndex !== undefined) {
        markPositions.add(originalIndex);
      }
    }
  }

  if (matchType === 'fuzzy') {
    const lowerAccentlessName = accentlessName.toLowerCase();
    let queryIndex = 0;
    for (let i = 0; i < lowerAccentlessName.length && queryIndex < normalizedQuery.length; i += 1) {
      if (lowerAccentlessName[i] === normalizedQuery[queryIndex]) {
        const originalIndex = accentlessPositions[i];
        if (originalIndex !== undefined) {
          markPositions.add(originalIndex);
        }
        queryIndex += 1;
      }
    }
    if (markPositions.size === 0) {
      return [{ text: safeName, match: false }];
    }
  }

  if (markPositions.size === 0) {
    return [{ text: safeName, match: false }];
  }

  const segments = [];
  let currentSegment = '';
  let currentMatch = null;

  originalChars.forEach((char, index) => {
    const isMatch = markPositions.has(index);
    if (currentMatch === null) {
      currentMatch = isMatch;
      currentSegment = char;
      return;
    }

    if (isMatch === currentMatch) {
      currentSegment += char;
      return;
    }

    segments.push({ text: currentSegment, match: currentMatch });
    currentMatch = isMatch;
    currentSegment = char;
  });

  if (currentSegment) {
    segments.push({ text: currentSegment, match: currentMatch });
  }

  if (segments.length === 0) {
    return [{ text: safeName, match: false }];
  }

  return segments;
};

const DEFAULT_QUANTITY = 1;
const MAX_SUGGESTIONS = 20;

export default function AddItemModal({
  isOpen,
  onClose,
  onAddItem,
  customAisles = DEFAULT_AISLES,
  itemUsageHistory = [],
  existingItems = [],
  aisleColors = {}
}) {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState('Other');
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [comment, setComment] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionCloseTimeout = useRef(null);
  const nameInputRef = useRef(null);

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

  const getDefaultEnglishAisle = useCallback(() => {
    const defaultLocalized = getDefaultLocalizedAisle();
    return localizedToEnglish[defaultLocalized] || defaultLocalized || 'Other';
  }, [getDefaultLocalizedAisle, localizedToEnglish]);

  const resetForm = useCallback(() => {
    setName('');
    setAisle(getDefaultLocalizedAisle());
    setQuantity(DEFAULT_QUANTITY);
    setComment('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, [getDefaultLocalizedAisle]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      // Focus on name input when modal opens
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, resetForm]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (suggestionCloseTimeout.current) {
        clearTimeout(suggestionCloseTimeout.current);
      }
    };
  }, []);

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
        if (!originalName) return false;
        const englishAisle = entry?.usage_aisle?.trim() || entry?.last_aisle?.trim() || null;
        const usageKey =
          entry?.usage_key ||
          `${normalizeText(originalName)}::${normalizeText(englishAisle)}`;
        if (!usageKey || seen.has(usageKey)) return false;
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
          englishAisle,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const englishAisle = localizedToEnglish[aisle] || aisle;

    onAddItem({
      name: name.trim(),
      aisle: englishAisle,
      quantity: parseInt(quantity, 10),
      comment: comment.trim()
    });

    resetForm();
    onClose();
  };

  const handleNameChange = (value) => {
    setName(value);
    const newSuggestions = computeSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleSuggestionSelection = (suggestion) => {
    if (!suggestion || suggestion.isInCurrentList) return;

    const currentQuantity = parseInt(quantity, 10);
    const sanitizedQuantity =
      Number.isNaN(currentQuantity) || currentQuantity < 1 ? DEFAULT_QUANTITY : currentQuantity;
    const englishAisle =
      suggestion.englishAisle ||
      localizedToEnglish[aisle] ||
      localizedToEnglish[suggestion.displayAisle] ||
      getDefaultEnglishAisle();

    onAddItem({
      name: suggestion.item_name?.trim() || '',
      aisle: englishAisle,
      quantity: sanitizedQuantity,
      comment: comment.trim()
    });

    resetForm();
    onClose();
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-2';
  const controlClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors duration-200';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t('addItemForm.addTitle')}
            </h2>
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
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder={t('addItemForm.itemNamePlaceholder')}
                  className={controlClass}
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
                        disabled={suggestion.isInCurrentList}
                        className={`w-full px-3 py-2 text-left transition-colors duration-150 flex items-center justify-between gap-3 ${
                          suggestion.isInCurrentList
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate min-w-0">
                          {suggestion.highlightSegments?.length
                            ? suggestion.highlightSegments.map((segment, index) =>
                                segment.match ? (
                                  <mark
                                    key={`${suggestion.item_name}-${index}-match`}
                                    data-testid="highlight-segment-match"
                                    className="rounded-sm bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 px-0.5"
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
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {suggestion.displayAisle && (
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: suggestion.badgeBackground,
                                color: suggestion.badgeTextColor,
                                borderColor: suggestion.badgeBorderColor
                              }}
                            >
                              {suggestion.displayAisle}
                            </span>
                          )}
                          {suggestion.isInCurrentList && (
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {t('topItems.alreadyAdded')}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              {t('addItemForm.addButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
