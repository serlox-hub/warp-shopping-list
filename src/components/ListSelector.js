'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';
import { ShoppingListService } from '@/lib/shoppingListService';

export default function ListSelector({ currentList, onListChange }) {
  const { user } = useAuth();
  const t = useTranslations();
  const [lists, setLists] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState(null);
  const [editListName, setEditListName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedListIds, setSharedListIds] = useState(new Set());

  const loadLists = useCallback(async () => {
    if (!user?.id) {
      setLists([]);
      setSharedListIds(new Set());
      return;
    }

    try {
      const userLists = await ShoppingListService.getUserShoppingLists(user.id);
      setLists(userLists);

      // Check which lists are shared (have more than 1 member)
      const sharedIds = new Set();
      await Promise.all(
        userLists.map(async (list) => {
          try {
            const isShared = await ShoppingListService.isListShared(list.id);
            if (isShared) {
              sharedIds.add(list.id);
            }
          } catch {
            // Ignore errors for individual list checks
          }
        })
      );
      setSharedListIds(sharedIds);
    } catch (error) {
      console.error('Error loading lists:', error);
      setLists([]);
      setSharedListIds(new Set());
    }
  }, [user?.id]);

  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only trigger on user.id change

  const handleListSelect = async (list) => {
    if (!user?.id) {
      return;
    }

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
    if (!user?.id) return;

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

  const handleEditList = (e, list) => {
    e.stopPropagation();
    setEditingListId(list.id);
    setEditListName(list.name);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editListName.trim()) return;

    setLoading(true);
    try {
      await ShoppingListService.updateShoppingListName(editingListId, editListName.trim());
      await loadLists();
      
      // If we edited the current list, update it
      if (editingListId === currentList?.id) {
        const updatedList = { ...currentList, name: editListName.trim() };
        onListChange(updatedList);
      }
      
      setEditingListId(null);
      setEditListName('');
    } catch (error) {
      console.error('Error updating list name:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingListId(null);
    setEditListName('');
  };

  const handleDeleteList = async (e, listId) => {
    e.stopPropagation();
    if (!user?.id) return;
    
    if (lists.length === 1) {
      alert(t('listSelector.cannotDeleteLast'));
      return;
    }

    if (!confirm(t('listSelector.confirmDelete'))) {
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

  const triggerButtonClass =
    'inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-400/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const dropdownContainerClass =
    'absolute left-0 top-full mt-2 w-72 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl dark:shadow-slate-900/40 z-50 max-h-72 overflow-y-auto backdrop-blur';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={triggerButtonClass}
        title={t('listSelector.switchList')}
      >
        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span className="text-sm font-medium max-w-32 truncate text-slate-900 dark:text-slate-100">
          {currentList.name}
        </span>
        {sharedListIds.has(currentList.id) && (
          <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" title={t('share.members')}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )}
        <svg className={`w-3 h-3 transition-transform duration-200 text-slate-500 dark:text-slate-400 ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className={dropdownContainerClass}>
          {/* Current lists */}
          <div className="p-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 font-semibold uppercase tracking-wider">
              {t('listSelector.yourLists', { count: lists.length })}
            </div>
            {lists.map((list) => (
              <div key={list.id}>
                {editingListId === list.id ? (
                  // Edit mode
                  <form onSubmit={handleSaveEdit} className="p-2">
                    <input
                      type="text"
                      value={editListName}
                      onChange={(e) => setEditListName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 mb-2"
                      autoFocus
                      maxLength={50}
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={!editListName.trim() || loading}
                        className="flex-1 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {t('common.save')}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                ) : (
                  // View mode
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleListSelect(list)}
                      disabled={loading}
                      className={`flex-1 flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 ${
                        list.id === currentList?.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-400/60'
                          : 'text-slate-700 dark:text-slate-300 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm truncate max-w-32">{list.name}</span>
                        {sharedListIds.has(list.id) && (
                          <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" title={t('share.members')}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        )}
                        {list.id === currentList?.id && (
                          <svg className="w-3 h-3 text-indigo-500 dark:text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleEditList(e, list)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors duration-200"
                        title={t('listSelector.editList')}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {lists.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteList(e, list.id)}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors duration-200"
                          title={t('listSelector.deleteList')}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>

          {/* Create new list section */}
          <div className="p-2">
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 rounded-lg transition-colors duration-200 font-semibold"
              >
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">{t('listSelector.newList')}</span>
              </button>
            ) : (
              <form onSubmit={handleCreateList} className="space-y-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={t('listSelector.listNamePlaceholder')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  autoFocus
                  maxLength={50}
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={!newListName.trim() || loading}
                    className="flex-1 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {t('listSelector.createList')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewListName('');
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                  >
                    {t('common.cancel')}
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
            setEditingListId(null);
            setEditListName('');
          }}
        />
      )}
    </div>
  );
}
