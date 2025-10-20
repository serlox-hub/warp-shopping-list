'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AddItemForm from '@/components/AddItemForm';
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
  const englishCustomAisles = useMemo(() => mapLocalizedToEnglish(customAisles, t), [customAisles, t]);
  const primaryActionClass = 'inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed';
  const subtleActionClass = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const dangerActionClass = 'inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 disabled:cursor-not-allowed';

  const applyAisleState = useCallback((rawAisles) => {
    if (!rawAisles || rawAisles.length === 0) {
      setCustomAisles([]);
      setAisleColors({});
      return;
    }

    const englishNames = rawAisles.map(aisle => aisle.name);
    const localizedNames = mapEnglishToLocalized(englishNames, t);
    const colorMap = localizedNames.reduce((acc, localizedName, index) => {
      const englishName = englishNames[index];
      const aisleColor = rawAisles[index]?.color || getDefaultAisleColor(englishName);
      acc[localizedName] = aisleColor;
      acc[englishName] = aisleColor;
      return acc;
    }, {});

    setCustomAisles(localizedNames);
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

  const loadItemUsageHistory = useCallback(async () => {
    if (!userId) {
      setItemUsageHistory([]);
      return;
    }

    try {
      const history = await ShoppingListService.getItemUsageHistory(userId);
      setItemUsageHistory(history);
    } catch (error) {
      console.error('Error loading item usage history:', error);
      setItemUsageHistory([]);
    }
  }, [userId]);

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
      const newItem = await ShoppingListService.addShoppingItem(
        shoppingList.id,
        user.id,
        itemData
      );
      setItems(prev => [newItem, ...prev]);
      await loadTopItems();
      await loadItemUsageHistory();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleUpdateItem = async (updatedItem) => {
    const previousItem = editingItem;

    try {
      const updated = await ShoppingListService.updateShoppingItem(updatedItem.id, {
        name: updatedItem.name,
        aisle: updatedItem.aisle,
        quantity: updatedItem.quantity,
        comment: updatedItem.comment
      });
      
      setItems(prev => prev.map(item => 
        item.id === updated.id ? updated : item
      ));

      if (user && previousItem) {
        const previousName = previousItem.name?.trim() || '';
        const updatedName = updated.name?.trim() || '';
        const nameChanged = previousName.toLowerCase() !== updatedName.toLowerCase();
        const metadataChanged = previousItem.aisle !== updated.aisle || previousItem.quantity !== updated.quantity;

        if (nameChanged) {
          await ShoppingListService.renameItemUsage(user.id, previousItem.name, updated.name, {
            oldAisle: previousItem.aisle,
            newAisle: updated.aisle,
            quantity: updated.quantity
          });
        } else if (metadataChanged) {
          await ShoppingListService.updateItemUsageMetadata(user.id, updated.name, {
            aisle: updated.aisle,
            quantity: updated.quantity,
            previousAisle: previousItem.aisle,
            previousName: previousItem.name
          });
        }
      }

      await loadTopItems();
      await loadItemUsageHistory();
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
    } catch (error) {
      console.error('Error toggling item completion:', error);
    }
  };

  const handleChangeItemAisle = async (itemId, newAisle) => {
    const item = items.find(entry => entry.id === itemId);
    if (!item || !newAisle || item.aisle === newAisle) return;

    try {
      const updated = await ShoppingListService.updateShoppingItem(itemId, {
        aisle: newAisle
      });

      setItems(prev => prev.map(entry =>
        entry.id === updated.id ? updated : entry
      ));

      if (user) {
        await ShoppingListService.updateItemUsageMetadata(user.id, updated.name, {
          aisle: updated.aisle,
          quantity: updated.quantity,
          previousAisle: item.aisle,
          previousName: item.name
        });
      }

      await loadTopItems();
      await loadItemUsageHistory();
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
    const normalizedAisles = (pendingAisles || []).map((entry) => {
      if (typeof entry === 'string') {
        return {
          name: entry,
          color: aisleColors[entry] || null
        };
      }
      return entry;
    });

    const oldAisles = customAisles;
    const newAisleNames = normalizedAisles.map(aisle => aisle.name);
    const englishAisles = mapLocalizedToEnglish(newAisleNames, t);
    const englishPayload = englishAisles.map((name, index) => ({
      name,
      color: normalizedAisles[index]?.color || getDefaultAisleColor(name)
    }));
    const updatedColorMap = newAisleNames.reduce((acc, localizedName, index) => {
      const englishName = englishAisles[index];
      const color = normalizedAisles[index]?.color || getDefaultAisleColor(englishName);
      acc[localizedName] = color;
      acc[englishName] = color;
      return acc;
    }, {});

    try {
      // Update aisles in database
      await ShoppingListService.updateUserAisles(user.id, englishPayload);
      setCustomAisles(newAisleNames);
      setAisleColors(updatedColorMap);
    } catch (error) {
      console.error('Error updating user aisles:', error);
      return; // Don't proceed with item updates if aisle update failed
    }

    // Update existing items if any aisles were renamed
    // We need to detect renames by checking which aisles disappeared and which are new
    const removedAisles = oldAisles.filter(aisle => !newAisleNames.includes(aisle));
    const addedAisles = newAisleNames.filter(aisle => !oldAisles.includes(aisle));
    
    if (removedAisles.length === 1 && addedAisles.length === 1) {
      // Likely a rename operation
      const oldAisleName = removedAisles[0];
      const newAisleName = addedAisles[0];
      
      const updatedItems = updateItemsAisle(items, oldAisleName, newAisleName);
      setItems(updatedItems);
      
      // Update items in database for items that were renamed
      const itemsToUpdate = items.filter(item => item.aisle === oldAisleName);
      itemsToUpdate.forEach(async (item) => {
        try {
          await ShoppingListService.updateShoppingItem(item.id, {
            aisle: newAisleName
          });
        } catch (error) {
          console.error('Error updating item aisle in database:', error);
        }
      });
    } else if (removedAisles.length > 0) {
      // Multiple aisles removed, move items to "Other" if it exists, or first available aisle
      const fallbackAisle = newAisleNames.includes('Other') ? 'Other' : newAisleNames[0];
      
      let updatedItems = items;
      removedAisles.forEach(removedAisle => {
        updatedItems = updateItemsAisle(updatedItems, removedAisle, fallbackAisle);
        
        // Update in database
        const itemsToUpdate = items.filter(item => item.aisle === removedAisle);
        itemsToUpdate.forEach(async (item) => {
          try {
            await ShoppingListService.updateShoppingItem(item.id, {
              aisle: fallbackAisle
            });
          } catch (error) {
            console.error('Error updating item aisle in database:', error);
          }
        });
      });
      
      setItems(updatedItems);
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
    return customAisles.map((localizedName, index) => {
      const englishName = englishCustomAisles[index] || localizedName;
      const mappedColor = aisleColors[localizedName] || aisleColors[englishName];
      return {
        name: localizedName,
        color: mappedColor || getDefaultAisleColor(englishName)
      };
    });
  }, [customAisles, aisleColors, englishCustomAisles]);

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
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="order-2">
              <Header />
            </div>
            <div className="order-1 flex-1 min-w-0">
              <ListSelector currentList={shoppingList} onListChange={handleListChange} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="flex flex-wrap gap-2 ml-auto">
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

        {/* Add/Edit Item Form */}
        <div className="mb-8">
          <AddItemForm
            onAddItem={handleAddItem}
            editingItem={editingItem}
            onUpdateItem={handleUpdateItem}
            onCancelEdit={handleCancelEdit}
            customAisles={customAisles}
            itemUsageHistory={itemUsageHistory}
            existingItemNames={items.map(item => item.name)}
            existingItems={items}
            aisleColors={aisleColors}
          />
        </div>

        {hasItems && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white/40 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('shoppingList.itemsCompleted', { completed: completedCount, total: totalCount })}
            </div>
            <div className="w-full sm:w-72 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
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
      <button
        type="button"
        onClick={() => canOpenTopItems && setIsTopItemsOpen(true)}
        disabled={!canOpenTopItems}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:bg-slate-400 disabled:cursor-not-allowed text-white transition-colors duration-200 z-40"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a3 3 0 013-3h2a3 3 0 013 3v2m-1 4h-8m2 4h4m-9-8h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2z" />
        </svg>
        <span className="text-sm font-medium">
          {t('topItems.openButton')}
        </span>
      </button>

      {isTopItemsOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
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
              customAisles={customAisles}
              existingItemNames={items.map(item => item.name)}
              onClose={() => setIsTopItemsOpen(false)}
              aisleColors={aisleColors}
            />
          </div>
        </div>
      )}
    </div>
  );
}
