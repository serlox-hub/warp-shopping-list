'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingListService } from '@/lib/shoppingListService';

export default function ListSelector({ currentList, onListChange }) {
  const { user } = useAuth();
  const [lists, setLists] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadLists();
    }
  }, [user]);

  const loadLists = async () => {
    try {
      const userLists = await ShoppingListService.getUserShoppingLists(user.id);
      setLists(userLists);
    } catch (error) {
      console.error('Error loading lists:', error);
    }
  };

  const handleListSelect = async (list) => {
    if (list.id === currentList?.id) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const activeList = await ShoppingListService.setActiveList(user.id, list.id);
      onListChange(activeList);
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setLoading(true);
    try {
      const newList = await ShoppingListService.createShoppingList(
        user.id,
        newListName.trim(),
        true // Set as active
      );
      await loadLists();
      onListChange(newList);
      setNewListName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = async (e, listId) => {
    e.stopPropagation();
    
    if (lists.length === 1) {
      alert('Cannot delete the last remaining list');
      return;
    }

    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await ShoppingListService.deleteShoppingList(user.id, listId);
      await loadLists();
      
      // If we deleted the current list, load the new active list
      if (listId === currentList?.id) {
        const activeList = await ShoppingListService.getActiveShoppingList(user.id);
        onListChange(activeList);
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Error deleting list: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentList) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200 disabled:opacity-50"
        title="Switch shopping list"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span className="text-sm font-medium max-w-32 truncate text-gray-900 dark:text-gray-100">
          {currentList.name}
        </span>
        <svg className={`w-3 h-3 transition-transform duration-200 text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-gray-900/30 z-50 max-h-64 overflow-y-auto">
          {/* Current lists */}
          <div className="p-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 font-semibold uppercase tracking-wider">
              Your Lists ({lists.length})
            </div>
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => handleListSelect(list)}
                disabled={loading}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 ${
                  list.id === currentList?.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-sm truncate max-w-40">{list.name}</span>
                  {list.id === currentList?.id && (
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                {lists.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteList(e, list.id)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
                    title="Delete list"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>

          {/* Create new list section */}
          <div className="p-2">
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors duration-200 font-medium"
              >
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">Create New List</span>
              </button>
            ) : (
              <form onSubmit={handleCreateList} className="space-y-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter list name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  autoFocus
                  maxLength={50}
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={!newListName.trim() || loading}
                    className="flex-1 px-3 py-1 text-sm bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200 font-medium"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewListName('');
                    }}
                    className="flex-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setIsCreating(false);
            setNewListName('');
          }}
        />
      )}
    </div>
  );
}