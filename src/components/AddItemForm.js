'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_AISLES } from '@/types/shoppingList';

export default function AddItemForm({ onAddItem, editingItem, onUpdateItem, onCancelEdit, customAisles = DEFAULT_AISLES }) {
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState('Other');
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState('');

  // Update form values when editingItem changes
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '');
      setAisle(editingItem.aisle || (customAisles.includes('Other') ? 'Other' : customAisles[0] || ''));
      setQuantity(editingItem.quantity || 1);
      setComment(editingItem.comment || '');
    } else {
      // Reset to default values when not editing
      setName('');
      setAisle(customAisles.includes('Other') ? 'Other' : customAisles[0] || '');
      setQuantity(1);
      setComment('');
    }
  }, [editingItem, customAisles]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        name: name.trim(),
        aisle,
        quantity: parseInt(quantity),
        comment: comment.trim()
      });
    } else {
      onAddItem({
        name: name.trim(),
        aisle,
        quantity: parseInt(quantity),
        comment: comment.trim()
      });
    }

    // Only reset if not editing (values will be reset by useEffect)
    if (!editingItem) {
      setName('');
      setAisle(customAisles.includes('Other') ? 'Other' : customAisles[0] || '');
      setQuantity(1);
      setComment('');
    }
  };

  const handleCancel = () => {
    if (editingItem) {
      onCancelEdit();
      // Values will be reset by useEffect when editingItem becomes null
    }
  };

  const isEditing = !!editingItem;

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`p-4 rounded-lg border shadow-sm transition-colors duration-200 ${
        isEditing 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center space-x-2 mb-4">
        {isEditing && (
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )}
        <h3 className={`text-lg font-semibold ${
          isEditing 
            ? 'text-blue-800 dark:text-blue-200' 
            : 'text-gray-900 dark:text-gray-100'
        }`}>
          {editingItem ? 'Edit Item' : 'Add New Item'}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isEditing 
              ? 'text-blue-700 dark:text-blue-300' 
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            Item Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name"
            className={`w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200 ${
              isEditing
                ? 'border-blue-300 dark:border-blue-600 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
            }`}
            required
          />
        </div>
        
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isEditing 
              ? 'text-blue-700 dark:text-blue-300' 
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            Aisle
          </label>
          <select
            value={aisle}
            onChange={(e) => setAisle(e.target.value)}
            className={`w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 text-gray-900 dark:text-gray-100 transition-colors duration-200 ${
              isEditing
                ? 'border-blue-300 dark:border-blue-600 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
            }`}
          >
            {customAisles.map(aisleOption => (
              <option key={aisleOption} value={aisleOption}>
                {aisleOption}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isEditing 
              ? 'text-blue-700 dark:text-blue-300' 
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className={`w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 text-gray-900 dark:text-gray-100 transition-colors duration-200 ${
              isEditing
                ? 'border-blue-300 dark:border-blue-600 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
            }`}
          />
        </div>
      </div>
      
      {/* Comment field - full width */}
      <div className="mt-4">
        <label className={`block text-sm font-medium mb-1 ${
          isEditing 
            ? 'text-blue-700 dark:text-blue-300' 
            : 'text-gray-700 dark:text-gray-300'
        }`}>
          Comment (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a note or comment..."
          rows={2}
          className={`w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200 resize-none ${
            isEditing
              ? 'border-blue-300 dark:border-blue-600 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
          }`}
          maxLength={200}
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Optional note (max 200 characters)
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {comment.length}/200
          </span>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-4">
        {editingItem && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className={`px-4 py-2 text-white rounded-md transition-colors duration-200 font-medium ${
            isEditing
              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {editingItem ? 'Update Item' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}