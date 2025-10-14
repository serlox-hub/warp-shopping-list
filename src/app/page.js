'use client';

import { useState, useEffect } from 'react';
import AddItemForm from '@/components/AddItemForm';
import AisleSection from '@/components/AisleSection';
import Header from '@/components/Header';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingListService } from '@/lib/shoppingListService';
import { groupItemsByAisle } from '@/types/shoppingList';

export default function Home() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [listName, setListName] = useState('My Shopping List');
  const [shoppingList, setShoppingList] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (user && !shoppingList) {
      loadShoppingListData();
    }
  }, [user, shoppingList]);

  const loadShoppingListData = async () => {
    if (!user) return;
    
    setDataLoading(true);
    try {
      // Get or create the default shopping list for the user
      const list = await ShoppingListService.getDefaultShoppingList(user.id);
      setShoppingList(list);
      setListName(list.name);

      // Load items for this list
      const listItems = await ShoppingListService.getShoppingItems(list.id);
      setItems(listItems);
    } catch (error) {
      console.error('Error loading shopping list data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Update shopping list name in Supabase when it changes
  const updateListName = async (newName) => {
    if (!shoppingList || !newName.trim()) return;
    
    try {
      await ShoppingListService.updateShoppingListName(shoppingList.id, newName.trim());
      setListName(newName);
    } catch (error) {
      console.error('Error updating list name:', error);
      // Revert the name change on error
      setListName(shoppingList.name);
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
        quantity: updatedItem.quantity
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

  const groupedItems = groupItemsByAisle(items);
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  // Show loading while checking authentication or loading data
  if (loading || (user && dataLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onBlur={(e) => updateListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
              className="text-3xl font-bold text-gray-800 dark:text-gray-100 bg-transparent border-none focus:outline-none focus:ring-0"
            />
            <div className="flex items-center space-x-4">
              <Header />
              <div className="text-right">
                <div className="text-lg text-gray-600 dark:text-gray-300">
                  {completedCount} of {totalCount} items completed
                </div>
                {totalCount > 0 && (
                  <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    ></div>
                  </div>
                )}
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
              Clear Completed ({completedCount})
            </button>
            <button
              onClick={handleClearAll}
              disabled={totalCount === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200"
            >
              Clear All
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
          />
        </div>

        {/* Shopping List by Aisles */}
        <div className="space-y-6">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-xl">Your shopping list is empty</p>
              <p>Add some items to get started!</p>
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
      </div>
    </div>
  );
}