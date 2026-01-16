'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import FloatingAddButton from '@/components/FloatingAddButton';
import ItemModal from '@/components/ItemModal';
import AisleSection from '@/components/AisleSection';
import AisleManager from '@/components/AisleManager';
import SupermarketManager from '@/components/SupermarketManager';
import SupermarketSection from '@/components/SupermarketSection';
import Header from '@/components/Header';
import LoginForm from '@/components/LoginForm';
import ListSelector from '@/components/ListSelector';
import TopPurchasedItems from '@/components/TopPurchasedItems';
import ShareListButton from '@/components/ShareListButton';
import ListMembersDisplay from '@/components/ListMembersDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';
import { useNotification } from '@/contexts/NotificationContext';
import { ShoppingListService } from '@/lib/shoppingListService';
import {
  groupItemsByAisle,
  mapLocalizedToEnglish,
  mapEnglishToLocalized,
  getDefaultAisleColor
} from '@/types/shoppingList';

export default function Home() {
  const { user, loading } = useAuth();
  const t = useTranslations();
  const { showError, showSuccess } = useNotification();
  const userId = user?.id;
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [customAisles, setCustomAisles] = useState([]);
  const [aisleColors, setAisleColors] = useState({});
  const [showAisleManager, setShowAisleManager] = useState(false);
  const [showSupermarketManager, setShowSupermarketManager] = useState(false);
  const [supermarkets, setSupermarkets] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [topItemsLoading, setTopItemsLoading] = useState(false);
  const [isTopItemsOpen, setIsTopItemsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [isListShared, setIsListShared] = useState(false);
  const englishCustomAisles = useMemo(() => customAisles.filter(a => a && a.name).map(a => a.name), [customAisles]);
  const localizedCustomAisles = useMemo(() => {
    const englishNames = customAisles.filter(a => a && a.name).map(a => a.name);
    return mapEnglishToLocalized(englishNames, t);
  }, [customAisles, t]);
  const primaryActionClass = 'inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed';

  const applyAisleState = useCallback((rawAisles) => {
    if (!rawAisles || rawAisles.length === 0) {
      setCustomAisles([]);
      setAisleColors({});
      return;
    }

    setCustomAisles(rawAisles);

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

  const loadListAisles = useCallback(async (listId) => {
    if (!listId) {
      setCustomAisles([]);
      setAisleColors({});
      return;
    }

    try {
      const dbAisles = await ShoppingListService.getListAisles(listId);
      applyAisleState(dbAisles);
    } catch (error) {
      console.error('Error loading list aisles:', error);
      setCustomAisles([]);
      setAisleColors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // applyAisleState is stable

  const loadListSupermarkets = useCallback(async (listId) => {
    if (!listId) {
      setSupermarkets([]);
      return;
    }

    try {
      const dbSupermarkets = await ShoppingListService.getListSupermarkets(listId);
      setSupermarkets(dbSupermarkets);
    } catch (error) {
      console.error('Error loading list supermarkets:', error);
      setSupermarkets([]);
    }
  }, []);

  const loadShoppingListData = useCallback(async () => {
    if (!userId) {
      setShoppingList(null);
      setItems([]);
      setCustomAisles([]);
      setAisleColors({});
      setSupermarkets([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    try {
      const { list, items: listItems } = await ShoppingListService.getActiveShoppingListWithItems(userId);

      setShoppingList(list);
      setItems(listItems);

      // Load aisles and supermarkets for this list
      if (list?.id) {
        await Promise.all([
          loadListAisles(list.id),
          loadListSupermarkets(list.id)
        ]);
      }
    } catch (error) {
      console.error('Error loading shopping list data:', error);
      setItems([]);
    } finally {
      setDataLoading(false);
    }
  }, [userId, loadListAisles, loadListSupermarkets]);

  const loadTopItems = useCallback(async (listIdOverride) => {
    const listId = listIdOverride || shoppingList?.id;
    if (!listId) {
      setTopItems([]);
      return;
    }

    setTopItemsLoading(true);
    try {
      const mostPurchased = await ShoppingListService.getMostPurchasedItems(listId);
      const formattedItems = mostPurchased.map(item => ({
        item_name: item.name,
        purchase_count: item.purchase_count,
        last_aisle: item.aisle?.name || null,
        last_quantity: item.quantity || 1,
        usage_aisle: item.aisle?.name || null,
        usage_key: `${item.name}::${item.aisle?.name || ''}`,
        supermarket_id: item.supermarket_id || null
      }));
      setTopItems(formattedItems);
    } catch (error) {
      console.error('Error loading top purchased items:', error);
      setTopItems([]);
    } finally {
      setTopItemsLoading(false);
    }
  }, [shoppingList?.id]);


  useEffect(() => {
    if (userId) {
      loadShoppingListData();
    } else {
      setItems([]);
      setShoppingList(null);
      setTopItems([]);
      setCustomAisles([]);
      setAisleColors({});
      setSupermarkets([]);
      setDataLoading(false);
      setIsTopItemsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only trigger on userId change

  useEffect(() => {
    if (userId && !dataLoading && shoppingList?.id && topItems.length === 0) {
      loadTopItems();
    }
  }, [userId, dataLoading, shoppingList?.id, topItems.length, loadTopItems]);


  const handleListChange = async (newList) => {
    setShoppingList(newList);
    setEditingItem(null);

    // Reset state for new list
    setTopItems([]);

    // Load items, aisles, and supermarkets for the new list
    try {
      const [listItems, dbSupermarkets] = await Promise.all([
        ShoppingListService.getShoppingItems(newList.id),
        ShoppingListService.getListSupermarkets(newList.id)
      ]);
      setItems(listItems);
      setSupermarkets(dbSupermarkets);

      // Load aisles for the new list
      await loadListAisles(newList.id);

      // Reload history for the new list - pass the new list ID to avoid closure issue
      loadTopItems(newList.id);
    } catch (error) {
      console.error('Error loading items for new list:', error);
      setItems([]);
    }
  };

  const handleLeaveList = async () => {
    // After leaving a list, reload user's lists and switch to another
    await loadShoppingListData();
  };

  const handleAddItem = async (itemData) => {
    if (!shoppingList || !user) return;

    // Convert aisle name to aisle_id and get aisle object
    let aisleId = itemData.aisle_id;
    let aisleObj = null;
    if (!aisleId && itemData.aisle) {
      aisleObj = customAisles.find(a => a.name === itemData.aisle);
      aisleId = aisleObj?.id || null;
    } else if (aisleId) {
      aisleObj = customAisles.find(a => a.id === aisleId);
    }

    // Get supermarket object if assigned
    const supermarketId = itemData.supermarket_id || null;
    const supermarketObj = supermarketId ? supermarkets.find(s => s.id === supermarketId) : null;

    // Create optimistic item with temporary ID
    const optimisticItem = {
      id: `temp-${Date.now()}-${Math.random()}`,
      name: itemData.name,
      aisle: aisleObj || { id: aisleId, name: itemData.aisle || 'Other' },
      aisle_id: aisleId,
      supermarket: supermarketObj,
      supermarket_id: supermarketId,
      quantity: itemData.quantity || 1,
      comment: itemData.comment || '',
      completed: false,
      shopping_list_id: shoppingList.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optimistic update: Add item immediately
    setItems(prev => [optimisticItem, ...prev]);

    try {
      // Make the actual server request
      const newItem = await ShoppingListService.addShoppingItem(
        shoppingList.id,
        {
          ...itemData,
          aisle_id: aisleId,
          supermarket_id: supermarketId
        }
      );

      // Replace optimistic item with real item from server
      setItems(prev => prev.map(item =>
        item.id === optimisticItem.id ? newItem : item
      ));

      // Refresh top items in background
      loadTopItems();
    } catch (error) {
      console.error('Error adding item:', error);
      // Rollback: Remove the optimistic item
      setItems(prev => prev.filter(item => item.id !== optimisticItem.id));
      showError(t('errors.addItemFailed'));
    }
  };

  const handleUpdateItem = async (updatedItem) => {
    const previousItem = items.find(item => item.id === updatedItem.id);
    if (!previousItem) return;

    // Convert aisle name/object to aisle_id
    let aisleId = null;
    let aisleObj = null;

    if (updatedItem.aisle) {
      const aisleName = typeof updatedItem.aisle === 'string'
        ? updatedItem.aisle
        : updatedItem.aisle?.name;

      if (aisleName) {
        aisleObj = customAisles.find(a => a.name === aisleName);
        aisleId = aisleObj?.id || updatedItem.aisle?.id || updatedItem.aisle_id || null;
      }
    } else if (updatedItem.aisle_id) {
      aisleId = updatedItem.aisle_id;
      aisleObj = customAisles.find(a => a.id === aisleId);
    }

    // Get supermarket object if assigned
    const supermarketId = updatedItem.supermarket_id !== undefined
      ? updatedItem.supermarket_id
      : previousItem.supermarket_id;
    const supermarketObj = supermarketId ? supermarkets.find(s => s.id === supermarketId) : null;

    // Create optimistic updated item
    const optimisticItem = {
      ...previousItem,
      name: updatedItem.name,
      aisle: aisleObj || previousItem.aisle,
      aisle_id: aisleId,
      supermarket: supermarketObj,
      supermarket_id: supermarketId,
      quantity: updatedItem.quantity,
      comment: updatedItem.comment,
      updated_at: new Date().toISOString()
    };

    // Optimistic update: Update item immediately
    setItems(prev => prev.map(item =>
      item.id === updatedItem.id ? optimisticItem : item
    ));
    setEditingItem(null);

    try {
      // Make the actual server request
      const updated = await ShoppingListService.updateShoppingItem(updatedItem.id, {
        name: updatedItem.name,
        aisle_id: aisleId,
        supermarket_id: supermarketId,
        quantity: updatedItem.quantity,
        comment: updatedItem.comment
      });

      // Update with server response
      setItems(prev => prev.map(item =>
        item.id === updated.id ? updated : item
      ));

      // Check if name or aisle changed to refresh suggestions
      const nameChanged = previousItem.name !== updatedItem.name;
      const previousAisleName = previousItem.aisle?.name;
      const newAisleName = aisleObj?.name || updated.aisle?.name;
      const aisleChanged = previousAisleName !== newAisleName;

      // Refresh top items if item details changed or if completed
      if (nameChanged || aisleChanged || updated.completed) {
        loadTopItems();
      }
    } catch (error) {
      console.error('Error updating item:', error);
      // Rollback: Revert to previous state
      setItems(prev => prev.map(item =>
        item.id === updatedItem.id ? previousItem : item
      ));
      // Reopen edit modal on error
      setEditingItem(previousItem);
      showError(t('errors.updateItemFailed'));
    }
  };

  const handleToggleComplete = async (itemId) => {
    const item = items.find(item => item.id === itemId);
    if (!item) return;

    const previousCompleted = item.completed;
    const newCompleted = !previousCompleted;

    // Optimistic update: Toggle completion immediately
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, completed: newCompleted, updated_at: new Date().toISOString() } : i
    ));

    try {
      // Make the actual server request
      const updated = await ShoppingListService.updateShoppingItem(itemId, {
        completed: newCompleted
      });

      // Update with server response
      setItems(prev => prev.map(i =>
        i.id === updated.id ? updated : i
      ));

      // If item was just completed, refresh top items in background
      if (updated.completed) {
        loadTopItems();
      }
    } catch (error) {
      console.error('Error toggling item completion:', error);
      // Rollback: Revert to previous state
      setItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, completed: previousCompleted } : i
      ));
      showError(t('errors.toggleCompleteFailed'));
    }
  };

  const handleChangeItemAisle = async (itemId, newAisleName) => {
    const item = items.find(entry => entry.id === itemId);
    if (!item || !newAisleName || item.aisle?.name === newAisleName) return;

    // Find aisle_id from name
    const aisleObj = customAisles.find(a => a.name === newAisleName);
    if (!aisleObj) {
      console.error('Aisle not found:', newAisleName);
      return;
    }

    const previousAisle = item.aisle;
    const previousAisleId = item.aisle_id;

    // Optimistic update: Change aisle immediately
    setItems(prev => prev.map(entry =>
      entry.id === itemId
        ? { ...entry, aisle: aisleObj, aisle_id: aisleObj.id, updated_at: new Date().toISOString() }
        : entry
    ));

    try {
      // Make the actual server request
      const updated = await ShoppingListService.updateShoppingItem(itemId, {
        aisle_id: aisleObj.id
      });

      // Update with server response
      setItems(prev => prev.map(entry =>
        entry.id === updated.id ? updated : entry
      ));
    } catch (error) {
      console.error('Error changing item aisle:', error);
      // Rollback: Revert to previous aisle
      setItems(prev => prev.map(entry =>
        entry.id === itemId
          ? { ...entry, aisle: previousAisle, aisle_id: previousAisleId }
          : entry
      ));
      showError(t('errors.changeAisleFailed'));
    }
  };

  const handleChangeItemSupermarket = async (itemId, newSupermarketId) => {
    const item = items.find(entry => entry.id === itemId);
    if (!item) return;

    const currentSupermarketId = item.supermarket_id || item.supermarket?.id;
    if (newSupermarketId === currentSupermarketId) return;

    // Find supermarket object (null if removing assignment)
    const supermarketObj = newSupermarketId
      ? supermarkets.find(s => s.id === newSupermarketId)
      : null;

    const previousSupermarket = item.supermarket;
    const previousSupermarketId = item.supermarket_id;

    // Optimistic update: Change supermarket immediately
    setItems(prev => prev.map(entry =>
      entry.id === itemId
        ? { ...entry, supermarket: supermarketObj, supermarket_id: newSupermarketId, updated_at: new Date().toISOString() }
        : entry
    ));

    try {
      // Make the actual server request
      const updated = await ShoppingListService.updateShoppingItem(itemId, {
        supermarket_id: newSupermarketId
      });

      // Update with server response
      setItems(prev => prev.map(entry =>
        entry.id === updated.id ? updated : entry
      ));
    } catch (error) {
      console.error('Error changing item supermarket:', error);
      // Rollback: Revert to previous supermarket
      setItems(prev => prev.map(entry =>
        entry.id === itemId
          ? { ...entry, supermarket: previousSupermarket, supermarket_id: previousSupermarketId }
          : entry
      ));
      showError(t('errors.changeSupermarketFailed'));
    }
  };

  const handleDeleteItem = async (itemId) => {
    const itemToDelete = items.find(item => item.id === itemId);
    if (!itemToDelete) return;

    // Optimistic update: Remove item immediately
    setItems(prev => prev.filter(item => item.id !== itemId));
    if (editingItem?.id === itemId) {
      setEditingItem(null);
    }

    try {
      // Make the actual server request
      await ShoppingListService.deleteShoppingItem(itemId);
    } catch (error) {
      console.error('Error deleting item:', error);
      // Rollback: Restore the item
      setItems(prev => {
        // Find the correct position to insert back (try to maintain order)
        const index = prev.findIndex(item =>
          new Date(item.created_at) < new Date(itemToDelete.created_at)
        );
        if (index === -1) {
          return [itemToDelete, ...prev];
        }
        return [...prev.slice(0, index), itemToDelete, ...prev.slice(index)];
      });
      showError(t('errors.deleteItemFailed'));
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
  };

  const handleClearCompleted = async () => {
    if (!shoppingList) return;

    const completedItems = items.filter(item => item.completed);

    // Optimistic update: Remove completed items immediately
    setItems(prev => prev.filter(item => !item.completed));

    try {
      await ShoppingListService.clearCompletedItems(shoppingList.id);
    } catch (error) {
      console.error('Error clearing completed items:', error);
      // Rollback: Restore completed items
      setItems(prev => [...prev, ...completedItems]);
      showError(t('errors.clearCompletedFailed'));
    }
  };

  const handleClearAll = async () => {
    if (!shoppingList) return;

    const previousItems = items;
    const wasEditing = editingItem;

    // Optimistic update: Clear all items immediately
    setItems([]);
    setEditingItem(null);

    try {
      // Make the actual server request
      await ShoppingListService.clearAllItems(shoppingList.id);
    } catch (error) {
      console.error('Error clearing all items:', error);
      // Rollback: Restore all items
      setItems(previousItems);
      setEditingItem(wasEditing);
      showError(t('errors.clearAllFailed'));
    }
  };

  const handleDeleteFromHistory = async (itemName) => {
    if (!shoppingList?.id || !itemName) return;

    // Optimistic update: Remove item from topItems
    const previousTopItems = [...topItems];
    const filtered = topItems.filter(item => item.item_name !== itemName);
    setTopItems([...filtered]);

    try {
      await ShoppingListService.deleteFromPurchaseHistory(shoppingList.id, itemName);
      showSuccess(t('success.removedFromHistory', { itemName }));
    } catch (error) {
      console.error('Error deleting from purchase history:', error);
      // Rollback: Restore the items
      setTopItems(previousTopItems);
      showError(t('errors.removeFromHistoryFailed'));
    }
  };

  const handleUpdateAisles = async (pendingAisles) => {
    if (!shoppingList?.id) return;

    const normalizedAisles = (pendingAisles || []).map((entry) => {
      if (typeof entry === 'string') {
        return {
          name: entry,
          color: aisleColors[entry] || null
        };
      }
      return entry;
    });

    // Build a map of English name -> existing aisle for proper ID matching
    const existingAislesByName = new Map(
      customAisles.map(aisle => [aisle.name, aisle])
    );

    const englishPayload = normalizedAisles.map((localizedAisle, index) => {
      const englishNames = mapLocalizedToEnglish([localizedAisle.name], t);
      const englishName = englishNames[0];
      // Match by name instead of index to preserve ID across reordering
      const existing = existingAislesByName.get(englishName);

      return {
        id: existing?.id,
        name: englishName,
        color: localizedAisle.color || getDefaultAisleColor(englishName),
        display_order: index + 1
      };
    });

    try {
      const updatedAisles = await ShoppingListService.updateListAisles(shoppingList.id, englishPayload);
      applyAisleState(updatedAisles);

      // Refresh items to get updated aisle references
      const refreshedItems = await ShoppingListService.getShoppingItems(shoppingList.id);
      setItems(refreshedItems);
    } catch (error) {
      console.error('Error updating list aisles:', error);
    }
  };

  const handleUpdateSupermarkets = async (pendingSupermarkets) => {
    if (!shoppingList?.id) return;

    // Build a map of existing supermarkets by name for ID matching
    const existingSupermarketsByName = new Map(
      supermarkets.map(s => [s.name, s])
    );

    const payload = (pendingSupermarkets || []).map((supermarket, index) => {
      const existing = existingSupermarketsByName.get(supermarket.name);
      return {
        id: supermarket.id || existing?.id,
        name: supermarket.name,
        color: supermarket.color || '#6b7280',
        display_order: index + 1
      };
    });

    try {
      const updatedSupermarkets = await ShoppingListService.updateListSupermarkets(shoppingList.id, payload);
      setSupermarkets(updatedSupermarkets);
    } catch (error) {
      console.error('Error updating list supermarkets:', error);
    }
  };

  const handleQuickAddFromUsage = async (usageItem) => {
    if (!shoppingList || !user) return;

    const targetAisle = usageItem.last_aisle || 'Other';
    const targetQuantity = usageItem.last_quantity || 1;
    const targetSupermarketId = usageItem.supermarket_id || null;

    await handleAddItem({
      name: usageItem.item_name,
      aisle: targetAisle,
      quantity: targetQuantity,
      comment: '',
      supermarket_id: targetSupermarketId
    });
  };

  const handleOpenTopItems = async () => {
    if (topItems.length === 0 && !topItemsLoading) {
      await loadTopItems();
    }
    setIsTopItemsOpen(true);
  };

  const groupedItems = groupItemsByAisle(items, englishCustomAisles);
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const hasItems = totalCount > 0;
  const hasTopItemsData = topItems.length > 0;
  const canOpenTopItems = hasItems ? true : (hasTopItemsData || topItemsLoading);
  const hasSupermarkets = supermarkets.length > 0;

  // Group items by supermarket for hierarchical view
  const groupedBySupermarket = useMemo(() => {
    if (!hasSupermarkets) return null;

    const result = {
      unassigned: []
    };

    // Initialize groups for each supermarket
    supermarkets.forEach(sm => {
      result[sm.id] = [];
    });

    items.forEach(item => {
      const smId = item.supermarket_id || item.supermarket?.id;
      if (smId && result[smId]) {
        result[smId].push(item);
      } else {
        result.unassigned.push(item);
      }
    });

    return result;
  }, [items, supermarkets, hasSupermarkets]);

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
              <ListSelector
                currentList={shoppingList}
                onListChange={handleListChange}
                completedCount={completedCount}
                totalCount={totalCount}
              />
            </div>
            <div className="flex items-center gap-2">
              <ListMembersDisplay
                listId={shoppingList?.id}
                currentUserId={userId}
                onLeaveList={handleLeaveList}
                externalOpen={showMembersModal}
                onExternalClose={() => setShowMembersModal(false)}
                showButton={false}
                onMembersLoad={(data) => setIsListShared(data.isShared)}
              />
              <ShareListButton
                listId={shoppingList?.id}
                userId={userId}
                externalOpen={showShareModal}
                onExternalClose={() => setShowShareModal(false)}
                showButton={false}
              />
              <Header
                onShareList={() => setShowShareModal(true)}
                onViewMembers={() => setShowMembersModal(true)}
                onManageAisles={() => setShowAisleManager(true)}
                onManageSupermarkets={() => setShowSupermarketManager(true)}
                onOpenHistory={handleOpenTopItems}
                onClearCompleted={handleClearCompleted}
                onClearAll={handleClearAll}
                completedCount={completedCount}
                totalCount={totalCount}
                canOpenHistory={canOpenTopItems}
                isListShared={isListShared}
              />
            </div>
          </div>
        </header>

        {/* Shopping List */}
        <div className="space-y-6">
          {!hasItems ? (
            <div className="text-center py-12 space-y-6">
              <div className="text-gray-500 dark:text-gray-400">
                <p className="text-xl">{t('shoppingList.emptyTitle')}</p>
                <p>{t('shoppingList.emptySubtitle')}</p>
              </div>

              {/* Frequent Items Access */}
              {canOpenTopItems && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleOpenTopItems}
                    className={primaryActionClass}
                    disabled={!canOpenTopItems}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a3 3 0 013-3h2a3 3 0 013 3v2m-1 4h-8m2 4h4m-9-8h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2z" />
                    </svg>
                    <span>{t('topItems.openButton')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : hasSupermarkets && groupedBySupermarket ? (
            /* Hierarchical view: Supermarket -> Aisle -> Items */
            <>
              {supermarkets
                .filter(sm => groupedBySupermarket[sm.id] && groupedBySupermarket[sm.id].length > 0)
                .map((sm) => (
                  <SupermarketSection
                    key={sm.id}
                    supermarket={sm}
                    items={groupedBySupermarket[sm.id]}
                    customAisles={englishCustomAisles}
                    aisleColors={aisleColors}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteItem}
                    onEdit={handleEditItem}
                    availableAisles={englishCustomAisles}
                    onChangeAisle={handleChangeItemAisle}
                    availableSupermarkets={supermarkets}
                    onChangeSupermarket={handleChangeItemSupermarket}
                  />
                ))}
              {groupedBySupermarket.unassigned && groupedBySupermarket.unassigned.length > 0 && (
                <SupermarketSection
                  supermarket={{ name: t('shoppingList.unassigned'), color: '#6b7280' }}
                  items={groupedBySupermarket.unassigned}
                  customAisles={englishCustomAisles}
                  aisleColors={aisleColors}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteItem}
                  onEdit={handleEditItem}
                  availableAisles={englishCustomAisles}
                  onChangeAisle={handleChangeItemAisle}
                  availableSupermarkets={supermarkets}
                  onChangeSupermarket={handleChangeItemSupermarket}
                />
              )}
            </>
          ) : (
            /* Flat view: Aisle -> Items (no supermarkets) */
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
                availableSupermarkets={supermarkets}
                onChangeSupermarket={handleChangeItemSupermarket}
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

        {/* Supermarket Manager Modal */}
        {showSupermarketManager && (
          <SupermarketManager
            supermarkets={supermarkets}
            onUpdateSupermarkets={handleUpdateSupermarkets}
            onClose={() => setShowSupermarketManager(false)}
          />
        )}
      </div>
      {/* History Drawer */}
      <div
        className={`fixed inset-0 z-[120] transition-opacity duration-300 ${
          isTopItemsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={() => setIsTopItemsOpen(false)}
        />
        {/* Drawer */}
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-out ${
            isTopItemsOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <TopPurchasedItems
            items={topItems}
            loading={topItemsLoading}
            onAddItem={handleQuickAddFromUsage}
            onDeleteItem={handleDeleteFromHistory}
            customAisles={localizedCustomAisles}
            existingItemNames={items.map(item => item.name)}
            onClose={() => setIsTopItemsOpen(false)}
            aisleColors={aisleColors}
          />
        </div>
      </div>

      {/* Floating Add Button */}
      <FloatingAddButton onClick={() => setShowAddModal(true)} />

      {/* Item Modal - used for both add and edit */}
      <ItemModal
        isOpen={showAddModal || !!editingItem}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleUpdateItem : handleAddItem}
        mode={editingItem ? 'edit' : 'add'}
        item={editingItem}
        customAisles={localizedCustomAisles}
        englishAisles={englishCustomAisles}
        itemUsageHistory={topItems}
        existingItems={items}
        aisleColors={aisleColors}
        supermarkets={supermarkets}
      />
    </div>
  );
}
