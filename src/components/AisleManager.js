'use client';

import { useState } from 'react';
import { isValidAisleName } from '@/types/shoppingList';
import { useTranslations } from '@/contexts/LanguageContext';

export default function AisleManager({ aisles, onUpdateAisles, onClose }) {
  const t = useTranslations();
  const [editingAisles, setEditingAisles] = useState([...aisles]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingName, setEditingName] = useState('');
  const [newAisleName, setNewAisleName] = useState('');
  const [error, setError] = useState('');

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingName(editingAisles[index]);
    setError('');
  };

  const handleSaveEdit = () => {
    const trimmedName = editingName.trim();
    const otherAisles = editingAisles.filter((_, idx) => idx !== editingIndex);
    
    if (!isValidAisleName(trimmedName, otherAisles)) {
      setError(t('aisleManager.invalidName'));
      return;
    }

    const newAisles = [...editingAisles];
    newAisles[editingIndex] = trimmedName;
    setEditingAisles(newAisles);
    setEditingIndex(-1);
    setEditingName('');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(-1);
    setEditingName('');
    setError('');
  };

  const handleDeleteAisle = (index) => {
    if (editingAisles.length <= 1) {
      setError(t('aisleManager.cannotDeleteLast'));
      return;
    }
    
    const newAisles = editingAisles.filter((_, idx) => idx !== index);
    setEditingAisles(newAisles);
    setError('');
  };

  const handleAddAisle = () => {
    const trimmedName = newAisleName.trim();
    
    if (!isValidAisleName(trimmedName, editingAisles)) {
      setError(t('aisleManager.invalidName'));
      return;
    }

    setEditingAisles([...editingAisles, trimmedName]);
    setNewAisleName('');
    setError('');
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newAisles = [...editingAisles];
    [newAisles[index - 1], newAisles[index]] = [newAisles[index], newAisles[index - 1]];
    setEditingAisles(newAisles);
  };

  const handleMoveDown = (index) => {
    if (index === editingAisles.length - 1) return;
    const newAisles = [...editingAisles];
    [newAisles[index], newAisles[index + 1]] = [newAisles[index + 1], newAisles[index]];
    setEditingAisles(newAisles);
  };

  const handleSaveAll = () => {
    if (editingIndex !== -1) {
      setError(t('aisleManager.finishEditing'));
      return;
    }
    onUpdateAisles(editingAisles);
    onClose();
  };

  const handleReset = () => {
    setEditingAisles([...aisles]);
    setEditingIndex(-1);
    setEditingName('');
    setNewAisleName('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('aisleManager.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('aisleManager.subtitle')}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Aisle list */}
          <div className="space-y-2 mb-4">
            {editingAisles.map((aisle, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                {editingIndex === index ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        title={t('common.save')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        title={t('common.cancel')}
                      >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{aisle}</span>
                    
                    {/* Move buttons */}
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('aisleManager.moveUp')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === editingAisles.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('aisleManager.moveDown')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Edit and delete buttons */}
                    <button
                      onClick={() => handleStartEdit(index)}
                      className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      title={t('common.edit')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteAisle(index)}
                      className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title={t('common.delete')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new aisle */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newAisleName}
              onChange={(e) => setNewAisleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newAisleName.trim()) handleAddAisle();
              }}
              placeholder={t('aisleManager.addPlaceholder')}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={handleAddAisle}
              disabled={!newAisleName.trim()}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.add')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between space-x-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            {t('aisleManager.resetButton')}
          </button>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
            >
              {t('aisleManager.saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}