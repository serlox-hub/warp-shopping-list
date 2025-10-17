'use client';

import { useState, useEffect } from 'react';
import AddItemForm from '@/components/AddItemForm';
import AisleSection from '@/components/AisleSection';
import AisleManager from '@/components/AisleManager';
import Header from '@/components/Header';
import LoginForm from '@/components/LoginForm';
import ListSelector from '@/components/ListSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';
import { ShoppingListService } from '@/lib/shoppingListService';
import { 
  groupItemsByAisle,
  updateItemsAisle,
  mapLocalizedToEnglish,
  mapEnglishToLocalized,
  getLocalizedDefaultAisles
} from '@/types/shoppingList';

export default function Home() {
  const { user, loading } = useAuth();
  const t = useTranslations();
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [customAisles, setCustomAisles] = useState([]);
  const [showAisleManager, setShowAisleManager] = useState(false);

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      Promise.all([loadUserAisles(), loadShoppingListData()]);
    }
  }, [user]);

  const loadUserAisles = async () => {
    if (!user) return;
    
    try {
      const dbAisles = await ShoppingListService.getUserAisles(user.id);
      const localizedAisles = mapEnglishToLocalized(dbAisles, t);
      setCustomAisles(localizedAisles);
    } catch (error) {
      console.error('Error loading user aisles:', error);
    }
  };

  const loadShoppingListData = async () => {
    if (!user) return;
    
    setDataLoading(true);
    try {
      // Get the active shopping list for the user
      const list = await ShoppingListService.getActiveShoppingList(user.id);
      setShoppingList(list);

      // Load items for this list
      const listItems = await ShoppingListService.getShoppingItems(list.id);
      setItems(listItems);
    } catch (error) {
      console.error('Error loading shopping list data:', error);
    } finally {
      setDataLoading(false);
    }
  };


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
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleUpdateItem = async (updatedItem) => {
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

  const handleUpdateAisles = async (newAisles) => {
    const oldAisles = customAisles;
    // Convert localized aisles back to English for storage
    const englishAisles = mapLocalizedToEnglish(newAisles, t);
    
    try {
      // Update aisles in database
      await ShoppingListService.updateUserAisles(user.id, englishAisles);
      setCustomAisles(newAisles);
    } catch (error) {
      console.error('Error updating user aisles:', error);
      return; // Don't proceed with item updates if aisle update failed
    }

    // Update existing items if any aisles were renamed
    // We need to detect renames by checking which aisles disappeared and which are new
    const removedAisles = oldAisles.filter(aisle => !newAisles.includes(aisle));
    const addedAisles = newAisles.filter(aisle => !oldAisles.includes(aisle));
    
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
      const fallbackAisle = newAisles.includes('Other') ? 'Other' : newAisles[0];
      
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

  const groupedItems = groupItemsByAisle(items, customAisles);
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const hasItems = totalCount > 0;
  const progressPercentage = hasItems
    ? (completedCount / totalCount) * 100
    : 0;

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          {/* Top row: List selector and User Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <ListSelector currentList={shoppingList} onListChange={handleListChange} />
            </div>
            <Header />
          </div>
          
          {/* Progress section - separate row */}
          <div className="flex items-center justify-end mb-4">
            <div className={`text-right ${hasItems ? '' : 'invisible'}`}>
              <div className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                {t('shoppingList.itemsCompleted', { completed: completedCount, total: totalCount })}
              </div>
              <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleClearCompleted}
              disabled={completedCount === 0}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200"
            >
              {t('shoppingList.clearCompleted', { count: completedCount })}
            </button>
            <button
              onClick={handleClearAll}
              disabled={totalCount === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200"
            >
              {t('shoppingList.clearAll')}
            </button>
            <button
              onClick={() => setShowAisleManager(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>{t('shoppingList.manageAisles')}</span>
            </button>
          </div>
        </div>

        {/* Add/Edit Item Form */}
        <div className="mb-8">
          <AddItemForm
            onAddItem={handleAddItem}
            editingItem={editingItem}
            onUpdateItem={handleUpdateItem}
            onCancelEdit={handleCancelEdit}
            customAisles={customAisles}
          />
        </div>

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
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteItem}
                onEdit={handleEditItem}
              />
            ))
          )}
        </div>

        {/* Aisle Manager Modal */}
        {showAisleManager && (
          <AisleManager
            aisles={customAisles}
            onUpdateAisles={handleUpdateAisles}
            onClose={() => setShowAisleManager(false)}
          />
        )}
      </div>
    </div>
  );
}
