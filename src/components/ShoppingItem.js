'use client';

export default function ShoppingItem({ item, onToggleComplete, onDelete, onEdit }) {
  return (
    <div className={`flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-200 ${
      item.completed ? 'bg-gray-50 dark:bg-gray-800 opacity-75' : 'bg-white dark:bg-gray-800'
    }`}>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={() => onToggleComplete(item.id)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <div className={item.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
          <span className="font-medium">{item.name}</span>
          {item.quantity > 1 && (
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({item.quantity})</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
          {item.aisle}
        </span>
        <button
          onClick={() => onEdit(item)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors duration-200"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm transition-colors duration-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}