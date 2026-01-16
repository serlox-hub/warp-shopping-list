'use client';

import { useEffect, useState } from 'react';
import { normalizeHexColor } from '@/utils/colors';
import { useTranslations } from '@/contexts/LanguageContext';

const DEFAULT_SUPERMARKET_COLOR = '#6b7280';

function isValidSupermarketName(name, existingNames = []) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  const lowerName = trimmed.toLowerCase();
  return !existingNames.some((existing) => existing.toLowerCase() === lowerName);
}

export default function SupermarketManager({ supermarkets, onUpdateSupermarkets, onClose }) {
  const t = useTranslations();

  const normalizeSupermarkets = (values = []) =>
    values.map((supermarket) => {
      if (typeof supermarket === 'string') {
        return {
          name: supermarket,
          color: DEFAULT_SUPERMARKET_COLOR
        };
      }

      return {
        id: supermarket.id,
        name: supermarket.name,
        color: supermarket.color || DEFAULT_SUPERMARKET_COLOR
      };
    });

  const [editingSupermarkets, setEditingSupermarkets] = useState(normalizeSupermarkets(supermarkets));
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingName, setEditingName] = useState('');
  const [newSupermarketName, setNewSupermarketName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setEditingSupermarkets(normalizeSupermarkets(supermarkets));
  }, [supermarkets]);

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingName(editingSupermarkets[index].name);
    setError('');
  };

  const handleSaveEdit = () => {
    const trimmedName = editingName.trim();
    const otherNames = editingSupermarkets
      .filter((_, idx) => idx !== editingIndex)
      .map((s) => s.name);

    if (!isValidSupermarketName(trimmedName, otherNames)) {
      setError(t('supermarketManager.invalidName'));
      return;
    }

    setEditingSupermarkets((prev) => {
      const copy = [...prev];
      copy[editingIndex] = { ...copy[editingIndex], name: trimmedName };
      return copy;
    });

    setEditingIndex(-1);
    setEditingName('');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(-1);
    setEditingName('');
    setError('');
  };

  const handleDeleteSupermarket = (index) => {
    if (!confirm(t('supermarketManager.confirmDelete'))) {
      return;
    }
    setEditingSupermarkets((prev) => prev.filter((_, idx) => idx !== index));
    setError('');
  };

  const handleAddSupermarket = () => {
    const trimmedName = newSupermarketName.trim();
    const existingNames = editingSupermarkets.map((s) => s.name);

    if (!isValidSupermarketName(trimmedName, existingNames)) {
      setError(t('supermarketManager.invalidName'));
      return;
    }

    setEditingSupermarkets((prev) => [
      ...prev,
      { name: trimmedName, color: DEFAULT_SUPERMARKET_COLOR }
    ]);
    setNewSupermarketName('');
    setError('');
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    setEditingSupermarkets((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const handleMoveDown = (index) => {
    if (index === editingSupermarkets.length - 1) return;
    setEditingSupermarkets((prev) => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const handleColorChange = (index, nextColor) => {
    const color = normalizeHexColor(nextColor) || DEFAULT_SUPERMARKET_COLOR;
    setEditingSupermarkets((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], color };
      return copy;
    });
  };

  const handleSaveAll = () => {
    if (editingIndex !== -1) {
      setError(t('supermarketManager.finishEditing'));
      return;
    }

    onUpdateSupermarkets(editingSupermarkets);
    onClose();
  };

  const handleReset = () => {
    setEditingSupermarkets(normalizeSupermarkets(supermarkets));
    setEditingIndex(-1);
    setEditingName('');
    setNewSupermarketName('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('supermarketManager.title')}
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
            {t('supermarketManager.subtitle')}
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

          {/* Empty state */}
          {editingSupermarkets.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p>{t('supermarketManager.empty')}</p>
            </div>
          )}

          {/* Supermarket list */}
          <div className="space-y-2 mb-4">
            {editingSupermarkets.map((supermarket, index) => {
              const isEditing = editingIndex === index;

              return (
                <div
                  key={supermarket.id || `${supermarket.name}-${index}`}
                  className={`flex items-center gap-2 p-2 rounded-md border transition-colors duration-200 ${
                    isEditing
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleSaveEdit();
                          if (event.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        autoFocus
                      />
                      <input
                        type="color"
                        value={supermarket.color}
                        onChange={(event) => handleColorChange(index, event.target.value)}
                        aria-label={t('supermarketManager.colorLabel')}
                        className="h-9 w-9 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
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
                      <div className="flex items-center gap-2 flex-1">
                        <span
                          className="inline-flex h-3 w-3 rounded-full border border-gray-200 dark:border-gray-700"
                          style={{ backgroundColor: supermarket.color }}
                          aria-hidden="true"
                        ></span>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">
                          {supermarket.name}
                        </span>
                      </div>
                      <input
                        type="color"
                        value={supermarket.color}
                        onChange={(event) => handleColorChange(index, event.target.value)}
                        aria-label={t('supermarketManager.colorLabel')}
                        className="h-8 w-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      />

                      {/* Move buttons */}
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('supermarketManager.moveUp')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === editingSupermarkets.length - 1}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('supermarketManager.moveDown')}
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
                        onClick={() => handleDeleteSupermarket(index)}
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
              );
            })}
          </div>

          {/* Add new supermarket */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newSupermarketName}
              onChange={(event) => setNewSupermarketName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && newSupermarketName.trim()) handleAddSupermarket();
              }}
              placeholder={t('supermarketManager.addPlaceholder')}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={handleAddSupermarket}
              disabled={!newSupermarketName.trim()}
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
            {t('supermarketManager.resetButton')}
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
              {t('supermarketManager.saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
