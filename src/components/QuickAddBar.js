'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DEFAULT_AISLES, getDefaultAisleColor } from '@/types/shoppingList';
import { useTranslations } from '@/contexts/LanguageContext';
import { normalizeHexColor } from '@/utils/colors';

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

const MAX_SUGGESTIONS = 20;

export default function QuickAddBar({
  onAddItem,
  customAisles = DEFAULT_AISLES,
  itemUsageHistory = [],
  existingItems = [],
  aisleColors = {},
  availableAisles = []
}) {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState('Other');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAisleSelector, setShowAisleSelector] = useState(false);
  const suggestionCloseTimeout = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    setAisle(getDefaultLocalizedAisle());
  }, [getDefaultLocalizedAisle]);

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

    const englishAisle = localizedToEnglish[aisle] || aisle;

    onAddItem({
      name: name.trim(),
      aisle: englishAisle,
      quantity: 1,
      comment: ''
    });

    setName('');
    setAisle(getDefaultLocalizedAisle());
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleNameChange = (value) => {
    setName(value);
    const newSuggestions = computeSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleSuggestionSelection = (suggestion) => {
    if (!suggestion || suggestion.isInCurrentList) {
      return;
    }

    const englishAisle = suggestion.englishAisle || localizedToEnglish[aisle] || 'Other';

    onAddItem({
      name: suggestion.item_name?.trim() || '',
      aisle: englishAisle,
      quantity: 1,
      comment: ''
    });

    setName('');
    setAisle(getDefaultLocalizedAisle());
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
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

  const handleAisleChange = (newAisle) => {
    setAisle(newAisle);
    setShowAisleSelector(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-lg">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-3">
            {/* Input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={t('addItemForm.itemNamePlaceholder')}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors duration-200"
                autoComplete="off"
              />

              {/* Suggestions */}
              {showSuggestions && (
                <div
                  data-testid="item-suggestions"
                  className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl"
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
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
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
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
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
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t('topItems.alreadyAdded')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aisle Tag with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAisleSelector(!showAisleSelector)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                aria-haspopup="menu"
                aria-expanded={showAisleSelector}
                aria-label={t('shoppingList.changeAisle')}
              >
                {(() => {
                  const englishAisle = localizedToEnglish[aisle] || aisle;
                  const aisleColor = normalizeHexColor(aisleColors[aisle]) || getDefaultAisleColor(englishAisle);
                  return aisleColor ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: aisleColor }}
                      aria-hidden="true"
                    />
                  ) : null;
                })()}
                <span>{aisle}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Aisle Selector Dropdown */}
              {showAisleSelector && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAisleSelector(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 py-2">
                    <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('shoppingList.currentAisle')}
                    </div>
                    <div className="px-3 pb-2 text-sm text-gray-700 dark:text-gray-200">
                      {aisle}
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    <div className="max-h-60 overflow-y-auto">
                      {customAisles.map((aisleOption) => {
                        const englishAisle = localizedToEnglish[aisleOption] || aisleOption;
                        const aisleColor = normalizeHexColor(aisleColors[aisleOption]) || getDefaultAisleColor(englishAisle);
                        const isSelected = aisleOption === aisle;

                        return (
                          <button
                            key={aisleOption}
                            type="button"
                            onClick={() => handleAisleChange(aisleOption)}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 flex items-center gap-2 ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                            }`}
                            aria-current={isSelected ? 'true' : undefined}
                          >
                            {aisleColor && (
                              <span
                                className="inline-flex h-2.5 w-2.5 rounded-full border border-gray-200 dark:border-gray-700"
                                style={{ backgroundColor: aisleColor }}
                                aria-hidden="true"
                              ></span>
                            )}
                            <span>{aisleOption}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
