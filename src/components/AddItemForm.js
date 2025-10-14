'use client';

import { useState } from 'react';
import { DEFAULT_AISLES } from '@/types/shoppingList';

export default function AddItemForm({ onAddItem, editingItem, onUpdateItem, onCancelEdit }) {
  const [name, setName] = useState(editingItem?.name || '');
  const [aisle, setAisle] = useState(editingItem?.aisle || 'Other');
  const [quantity, setQuantity] = useState(editingItem?.quantity || 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        name: name.trim(),
        aisle,
        quantity: parseInt(quantity)
      });
    } else {
      onAddItem({
        name: name.trim(),
        aisle,
        quantity: parseInt(quantity)
      });
    }

    setName('');
    setAisle('Other');
    setQuantity(1);
  };

  const handleCancel = () => {
    if (editingItem) {
      onCancelEdit();
      setName('');
      setAisle('Other');
      setQuantity(1);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        {editingItem ? 'Edit Item' : 'Add New Item'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Item Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Aisle
          </label>
          <select
            value={aisle}
            onChange={(e) => setAisle(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {DEFAULT_AISLES.map(aisleOption => (
              <option key={aisleOption} value={aisleOption}>
                {aisleOption}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-4">
        {editingItem && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
        >
          {editingItem ? 'Update Item' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}