'use client';

export default function ShoppingItem({ item, onToggleComplete, onDelete, onEdit }) {
  return (
    <div className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-200 ${
      item.completed ? 'bg-gray-50 dark:bg-gray-800 opacity-75' : 'bg-white dark:bg-gray-800'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onToggleComplete(item.id)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
          />
          <div className="flex-1">
            <div className={item.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
              <span className="font-medium">{item.name}</span>
              {item.quantity > 1 && (
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({item.quantity})</span>
              )}
            </div>
            {item.comment && item.comment.trim() && (
              <div className={`mt-1 text-sm ${
                item.completed 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <svg className="w-3 h-3 inline mr-1 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {item.comment.trim()}
              </div>
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
    </div>
  );
}
