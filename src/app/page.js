'use client';

import { useState, useEffect } from 'react';
import AddItemForm from '@/components/AddItemForm';
import AisleSection from '@/components/AisleSection';
import ThemeToggle from '@/components/ThemeToggle';
import { createShoppingItem, groupItemsByAisle } from '@/types/shoppingList';

export default function Home() {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [listName, setListName] = useState('My Shopping List');

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedItems = localStorage.getItem('shoppingListItems');
    const savedListName = localStorage.getItem('shoppingListName');
    
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    }
    if (savedListName) {
      setListName(savedListName);
    }
  }, []);

  // Save data to localStorage whenever items or listName changes
  useEffect(() => {
    localStorage.setItem('shoppingListItems', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('shoppingListName', listName);
  }, [listName]);

  const handleAddItem = (itemData) => {
    const newItem = createShoppingItem(itemData.name, itemData.aisle, itemData.quantity);
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (updatedItem) => {
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    setEditingItem(null);
  };

  const handleToggleComplete = (itemId) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleDeleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    if (editingItem?.id === itemId) {
      setEditingItem(null);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleClearCompleted = () => {
    setItems(prev => prev.filter(item => !item.completed));
  };

  const handleClearAll = () => {
    setItems([]);
    setEditingItem(null);
  };

  const groupedItems = groupItemsByAisle(items);
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

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
              className="text-3xl font-bold text-gray-800 dark:text-gray-100 bg-transparent border-none focus:outline-none focus:ring-0"
            />
            <div className="flex items-center space-x-4">
              <ThemeToggle />
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