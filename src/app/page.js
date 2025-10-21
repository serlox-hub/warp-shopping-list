'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import QuickAddBar from '@/components/QuickAddBar';
import EditItemModal from '@/components/EditItemModal';
import AisleSection from '@/components/AisleSection';
import AisleManager from '@/components/AisleManager';
import Header from '@/components/Header';
import LoginForm from '@/components/LoginForm';
import ListSelector from '@/components/ListSelector';
import TopPurchasedItems from '@/components/TopPurchasedItems';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';
import { ShoppingListService } from '@/lib/shoppingListService';
import {
  groupItemsByAisle,
  updateItemsAisle,
  mapLocalizedToEnglish,
  mapEnglishToLocalized,
  getDefaultAisleColor
} from '@/types/shoppingList';

export default function Home() {
  const { user, loading } = useAuth();
  const t = useTranslations();
  const userId = user?.id;
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [customAisles, setCustomAisles] = useState([]);
  const [aisleColors, setAisleColors] = useState({});
  const [showAisleManager, setShowAisleManager] = useState(false);
  const [topItems, setTopItems] = useState([]);
  const [topItemsLoading, setTopItemsLoading] = useState(false);
  const [isTopItemsOpen, setIsTopItemsOpen] = useState(false);
  const [itemUsageHistory, setItemUsageHistory] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  // customAisles are now objects with {id, name, color, display_order}
  // Extract names for compatibility with components expecting string arrays
  const englishCustomAisles = useMemo(() => customAisles.filter(a => a && a.name).map(a => a.name), [customAisles]);
  const localizedCustomAisles = useMemo(() => {
    const englishNames = customAisles.filter(a => a && a.name).map(a => a.name);
    return mapEnglishToLocalized(englishNames, t);
  }, [customAisles, t]);
  const primaryActionClass = 'inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed';
  const subtleActionClass = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const dangerActionClass = 'inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 disabled:cursor-not-allowed';

  const applyAisleState = useCallback((rawAisles) => {
    if (!rawAisles || rawAisles.length === 0) {
      setCustomAisles([]);
      setAisleColors({});
      return;
    }

    // Store full aisle objects (with id, name, color, display_order)
    // This preserves IDs needed for proper FK relationships when updating
    setCustomAisles(rawAisles);

    // Build color map for quick lookup (both English and localized names)
    const colorMap = rawAisles.reduce((acc, aisle) => {
      const englishName = aisle.name;
      const localizedNames = mapEnglishToLocalized([englishName], t);
      const localizedName = localizedNames[0];
      const aisleColor = aisle.color || getDefaultAisleColor(englishName);

      acc[localizedName] = aisleColor;
      acc[englishName] = aisleColor;
      return acc;
    }, {});

    setAisleColors(colorMap);
  }, [t]);

  const loadUserAisles = useCallback(async () => {
    if (!userId) {
      setCustomAisles([]);
      setAisleColors({});
      return;
    }

    try {
      const dbAisles = await ShoppingListService.getUserAisles(userId);
      applyAisleState(dbAisles);
    } catch (error) {
      console.error('Error loading user aisles:', error);
      setCustomAisles([]);
      setAisleColors({});
    }
  }, [userId, applyAisleState]);

  const loadShoppingListData = useCallback(async () => {
    if (!userId) {
      setShoppingList(null);
      setItems([]);
      setDataLoading(false);
      return;
    }
    
    setDataLoading(true);
    try {
      const list = await ShoppingListService.getActiveShoppingList(userId);
      setShoppingList(list);

      const listItems = await ShoppingListService.getShoppingItems(list.id);
      setItems(listItems);
    } catch (error) {
      console.error('Error loading shopping list data:', error);
      setItems([]);
    } finally {
      setDataLoading(false);
    }
  }, [userId]);

  const loadTopItems = useCallback(async () => {
    if (!userId) {
      setTopItems([]);
      return;
    }

    setTopItemsLoading(true);
    try {
      const mostPurchased = await ShoppingListService.getMostPurchasedItems(userId);
      setTopItems(mostPurchased);
    } catch (error) {
      console.error('Error loading top purchased items:', error);
      setTopItems([]);
    } finally {
      setTopItemsLoading(false);
    }
  }, [userId]);

  // Item usage history is no longer needed as purchase_count is on items themselves
  const loadItemUsageHistory = useCallback(async () => {
    // This function is kept for backward compatibility but does nothing
    // Purchase counts are now tracked directly on shopping_items
    setItemUsageHistory([]);
  }, []);

  useEffect(() => {
    if (userId) {
      Promise.all([
        loadUserAisles(),
        loadShoppingListData(),
        loadTopItems(),
        loadItemUsageHistory()
      ]);
    } else {
      setItems([]);
      setShoppingList(null);
      setTopItems([]);
      setCustomAisles([]);
      setAisleColors({});
      setDataLoading(false);
      setIsTopItemsOpen(false);
      setItemUsageHistory([]);
    }
  }, [userId, loadShoppingListData, loadTopItems, loadUserAisles, loadItemUsageHistory, t]);


  const handleListChange = async (newList) => {
    setShoppingList(newList);
    setEditingItem(null);
    
    // Load items for the new list
    try {
      const listItems = await ShoppingListService.getShoppingItems(newList.id);
      setItems(listItems);
    } catch (error) {
      console.error('Error loading items for new list:', error);
      setItems([]);
    }
  };

  const handleAddItem = async (itemData) => {
    if (!shoppingList || !user) return;

    try {
      // Convert aisle name to aisle_id if aisle is provided as a name
      let aisleId = itemData.aisle_id;
      if (!aisleId && itemData.aisle) {
        const aisleObj = customAisles.find(a => a.name === itemData.aisle);
        aisleId = aisleObj?.id || null;
      }

      const newItem = await ShoppingListService.addShoppingItem(
        shoppingList.id,
        user.id,
        {
          ...itemData,
          aisle_id: aisleId
        }
      );
      setItems(prev => [newItem, ...prev]);
      await loadTopItems();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleUpdateItem = async (updatedItem) => {
    try {
      // Convert aisle name to aisle_id if aisle is provided as a name
      let aisleId = updatedItem.aisle_id;
      if (!aisleId && updatedItem.aisle) {
        const aisleObj = customAisles.find(a => a.name === updatedItem.aisle);
        aisleId = aisleObj?.id || null;
      }

      const updated = await ShoppingListService.updateShoppingItem(updatedItem.id, {
        name: updatedItem.name,
        aisle_id: aisleId,
        quantity: updatedItem.quantity,
        comment: updatedItem.comment
      });

      setItems(prev => prev.map(item =>
        item.id === updated.id ? updated : item
      ));

      // Refresh top items if the purchase count may have changed
      if (updated.completed) {
        await loadTopItems();
      }
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleToggleComplete = async (itemId) => {
    const item = items.find(item => item.id === itemId);
    if (!item) return;

    try {
      const updated = await ShoppingListService.updateShoppingItem(itemId, {
        completed: !item.completed
      });

      setItems(prev => prev.map(item =>
        item.id === updated.id ? updated : item
      ));

      // If item was just completed, refresh top items (purchase_count was incremented)
      if (updated.completed) {
        await loadTopItems();
      }
    } catch (error) {
      console.error('Error toggling item completion:', error);
    }
  };

  const handleChangeItemAisle = async (itemId, newAisleName) => {
    const item = items.find(entry => entry.id === itemId);
    if (!item || !newAisleName || item.aisle?.name === newAisleName) return;

    try {
      // Find aisle_id from name
      const aisleObj = customAisles.find(a => a.name === newAisleName);
      if (!aisleObj) {
        console.error('Aisle not found:', newAisleName);
        return;
      }

      const updated = await ShoppingListService.updateShoppingItem(itemId, {
        aisle_id: aisleObj.id
      });

      setItems(prev => prev.map(entry =>
        entry.id === updated.id ? updated : entry
      ));
    } catch (error) {
      console.error('Error changing item aisle:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await ShoppingListService.deleteShoppingItem(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      if (editingItem?.id === itemId) {
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleClearCompleted = async () => {
    if (!shoppingList) return;
    
    try {
      await ShoppingListService.clearCompletedItems(shoppingList.id);
      setItems(prev => prev.filter(item => !item.completed));
    } catch (error) {
      console.error('Error clearing completed items:', error);
    }
  };

  const handleClearAll = async () => {
    if (!shoppingList) return;
    
    try {
      await ShoppingListService.clearAllItems(shoppingList.id);
      setItems([]);
      setEditingItem(null);
    } catch (error) {
      console.error('Error clearing all items:', error);
    }
  };

  const handleUpdateAisles = async (pendingAisles) => {
    // Normalize pending aisles to objects with {name, color}
    const normalizedAisles = (pendingAisles || []).map((entry) => {
      if (typeof entry === 'string') {
        return {
          name: entry,
          color: aisleColors[entry] || null
        };
      }
      return entry;
    });

    // Map localized names back to English and match with existing IDs BY INDEX
    // AisleManager preserves order, so index position = identity
    const englishPayload = normalizedAisles.map((localizedAisle, index) => {
      const englishNames = mapLocalizedToEnglish([localizedAisle.name], t);
      const englishName = englishNames[0];

      // IMPORTANT: Match by index, not by name (allows renaming!)
      // If user renamed "Produce" to "Fruits", it's still at the same index
      const existing = customAisles[index];

      return {
        id: existing?.id, // Preserve ID using index-based matching
        name: englishName,
        color: localizedAisle.color || getDefaultAisleColor(englishName),
        display_order: index + 1
      };
    });

    try {
      // Update aisles in database - service handles renames by ID automatically!
      // Items with aisle_id FK will automatically show the new name on next fetch
      const updatedAisles = await ShoppingListService.updateUserAisles(user.id, englishPayload);

      // Apply the updated aisles to state
      applyAisleState(updatedAisles);

      // Reload items to reflect any aisle name changes (FK preserved, name updated)
      if (shoppingList) {
        const refreshedItems = await ShoppingListService.getShoppingItems(shoppingList.id);
        setItems(refreshedItems);
      }
    } catch (error) {
      console.error('Error updating user aisles:', error);
    }
  };

  const handleQuickAddFromUsage = async (usageItem) => {
    if (!shoppingList || !user) return;

    const targetAisle = usageItem.last_aisle || 'Other';
    const targetQuantity = usageItem.last_quantity || 1;

    await handleAddItem({
      name: usageItem.item_name,
      aisle: targetAisle,
      quantity: targetQuantity,
      comment: ''
    });
  };

  const groupedItems = groupItemsByAisle(items, englishCustomAisles);
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const hasItems = totalCount > 0;
  const progressPercentage = hasItems
    ? (completedCount / totalCount) * 100
    : 0;
  const hasTopItemsData = topItems.length > 0;
  const canOpenTopItems = hasTopItemsData || topItemsLoading;

  const managerAisles = useMemo(() => {
    return localizedCustomAisles.map((localizedName, index) => {
      const englishName = englishCustomAisles[index] || localizedName;
      const mappedColor = aisleColors[localizedName] || aisleColors[englishName];
      return {
        name: localizedName,
        color: mappedColor || getDefaultAisleColor(englishName)
      };
    });
  }, [localizedCustomAisles, aisleColors, englishCustomAisles]);

  // Show loading while checking authentication or loading data
  if (loading || (user && dataLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" data-testid="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-6 py-8 pb-32 space-y-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <ListSelector currentList={shoppingList} onListChange={handleListChange} />
            </div>
            <Header />

            {/* Desktop: Show all buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={handleClearCompleted}
                disabled={completedCount === 0}
                className={subtleActionClass}
              >
                {t('shoppingList.clearCompleted', { count: completedCount })}
              </button>
              <button
                onClick={handleClearAll}
                disabled={totalCount === 0}
                className={dangerActionClass}
              >
                {t('shoppingList.clearAll')}
              </button>
              <button
                type="button"
                onClick={() => canOpenTopItems && setIsTopItemsOpen(true)}
                disabled={!canOpenTopItems}
                className={subtleActionClass}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a3 3 0 013-3h2a3 3 0 013 3v2m-1 4h-8m2 4h4m-9-8h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2z" />
                </svg>
                <span>{t('topItems.openButton')}</span>
              </button>
              <button
                onClick={() => setShowAisleManager(true)}
                className={primaryActionClass}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>{t('shoppingList.manageAisles')}</span>
              </button>
            </div>
          </div>
        </header>


        {hasItems && (
          <div className="relative flex items-center justify-between bg-white/40 dark:bg-slate-900/40 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {/* Circular Progress Indicator */}
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 14}`}
                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - progressPercentage / 100)}`}
                    className="text-emerald-500 dark:text-emerald-400 transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {Math.round(progressPercentage)}
                  </span>
                </div>
              </div>

              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {t('shoppingList.itemsCompleted', { completed: completedCount, total: totalCount })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Completion badge - only show when all done */}
              {completedCount === totalCount && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold hidden sm:inline">¡Completado!</span>
                </div>
              )}

              {/* Kebab Menu - Mobile only */}
              <div className="relative lg:hidden">
                <button
                  type="button"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Acciones"
                  aria-haspopup="menu"
                  aria-expanded={showActionsMenu}
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showActionsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowActionsMenu(false)}
                    ></div>
                    <div
                      className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 z-20"
                      role="menu"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowAisleManager(true);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>{t('shoppingList.manageAisles')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          canOpenTopItems && setIsTopItemsOpen(true);
                        }}
                        disabled={!canOpenTopItems}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a3 3 0 013-3h2a3 3 0 013 3v2m-1 4h-8m2 4h4m-9-8h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2z" />
                        </svg>
                        <span>{t('topItems.openButton')}</span>
                      </button>

                      <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleClearCompleted();
                        }}
                        disabled={completedCount === 0}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{t('shoppingList.clearCompleted', { count: completedCount })}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleClearAll();
                        }}
                        disabled={totalCount === 0}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>{t('shoppingList.clearAll')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shopping List by Aisles */}
        <div className="space-y-6">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-xl">{t('shoppingList.emptyTitle')}</p>
              <p>{t('shoppingList.emptySubtitle')}</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([aisle, aisleItems]) => (
              <AisleSection
                key={aisle}
                aisle={aisle}
                items={aisleItems}
                aisleColors={aisleColors}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteItem}
                onEdit={handleEditItem}
                availableAisles={englishCustomAisles}
                onChangeAisle={handleChangeItemAisle}
              />
            ))
          )}
        </div>

        {/* Aisle Manager Modal */}
        {showAisleManager && (
          <AisleManager
            aisles={managerAisles}
            onUpdateAisles={handleUpdateAisles}
            onClose={() => setShowAisleManager(false)}
          />
        )}
      </div>
      {isTopItemsOpen && (
        <div
          className="fixed inset-0 z-[120] flex justify-end bg-black/30 backdrop-blur-sm"
          onClick={() => setIsTopItemsOpen(false)}
        >
          <div
            className="w-full max-w-md h-full sm:h-auto sm:max-h-[85vh] sm:my-10 sm:mr-8 overflow-hidden rounded-none sm:rounded-2xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <TopPurchasedItems
              items={topItems}
              loading={topItemsLoading}
              onAddItem={handleQuickAddFromUsage}
              customAisles={localizedCustomAisles}
              existingItemNames={items.map(item => item.name)}
              onClose={() => setIsTopItemsOpen(false)}
              aisleColors={aisleColors}
            />
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onUpdateItem={handleUpdateItem}
          onClose={handleCancelEdit}
          customAisles={localizedCustomAisles}
        />
      )}

      {/* Quick Add Bar */}
      <QuickAddBar
        onAddItem={handleAddItem}
        customAisles={localizedCustomAisles}
        itemUsageHistory={itemUsageHistory}
        existingItems={items}
        aisleColors={aisleColors}
        availableAisles={englishCustomAisles}
      />
    </div>
  );
}
