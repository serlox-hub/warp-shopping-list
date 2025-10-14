import { supabase } from './supabase'

// Table structures needed in Supabase:
// 
// shopping_lists table:
// - id: uuid (primary key)
// - user_id: uuid (foreign key to auth.users)
// - name: text
// - created_at: timestamp
// - updated_at: timestamp
//
// shopping_items table:
// - id: uuid (primary key) 
// - shopping_list_id: uuid (foreign key to shopping_lists)
// - user_id: uuid (foreign key to auth.users)
// - name: text
// - aisle: text
// - quantity: integer
// - completed: boolean
// - comment: text (optional)
// - created_at: timestamp
// - updated_at: timestamp

export class ShoppingListService {
  // Get all shopping lists for a user
  static async getUserShoppingLists(userId) {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .order('list_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user shopping lists:', error);
      throw error;
    }
  }

  // Get the active shopping list for a user
  static async getActiveShoppingList(userId) {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        // If no active list exists, create a default one
        if (error.code === 'PGRST116') {
          return this.createShoppingList(userId, 'My Shopping List', true);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting active shopping list:', error);
      throw error;
    }
  }

  // Create a new shopping list
  static async createShoppingList(userId, name, setAsActive = false) {
    try {
      // If setting as active, deactivate other lists first
      if (setAsActive) {
        await this.deactivateAllLists(userId);
      }

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([
          {
            user_id: userId,
            name: name.trim(),
            is_active: setAsActive
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating shopping list:', error);
      throw error;
    }
  }

  // Set a list as active (deactivates others)
  static async setActiveList(userId, listId) {
    try {
      // Deactivate all lists for user
      await this.deactivateAllLists(userId);

      // Activate the selected list
      const { data, error } = await supabase
        .from('shopping_lists')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', listId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting active list:', error);
      throw error;
    }
  }

  // Deactivate all lists for a user
  static async deactivateAllLists(userId) {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deactivating lists:', error);
      throw error;
    }
  }

  // Delete a shopping list
  static async deleteShoppingList(userId, listId) {
    try {
      // Check if this is the only list
      const allLists = await this.getUserShoppingLists(userId);
      if (allLists.length === 1) {
        throw new Error('Cannot delete the last remaining list');
      }

      const listToDelete = allLists.find(list => list.id === listId);
      const wasActive = listToDelete?.is_active;

      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', userId);

      if (error) throw error;

      // If we deleted the active list, make the first remaining list active
      if (wasActive) {
        const remainingLists = allLists.filter(list => list.id !== listId);
        if (remainingLists.length > 0) {
          await this.setActiveList(userId, remainingLists[0].id);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting shopping list:', error);
      throw error;
    }
  }

  // Update shopping list name
  static async updateShoppingListName(listId, name) {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', listId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shopping list name:', error);
      throw error;
    }
  }

  // Get all items for a shopping list
  static async getShoppingItems(listId) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('shopping_list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting shopping items:', error);
      throw error;
    }
  }

  // Add a new shopping item
  static async addShoppingItem(listId, userId, itemData) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .insert([
          {
            shopping_list_id: listId,
            user_id: userId,
            name: itemData.name,
            aisle: itemData.aisle,
            quantity: itemData.quantity,
            comment: itemData.comment || '',
            completed: false,
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding shopping item:', error);
      throw error;
    }
  }

  // Update a shopping item
  static async updateShoppingItem(itemId, updates) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shopping item:', error);
      throw error;
    }
  }

  // Delete a shopping item
  static async deleteShoppingItem(itemId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting shopping item:', error);
      throw error;
    }
  }

  // Clear completed items
  static async clearCompletedItems(listId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('shopping_list_id', listId)
        .eq('completed', true);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing completed items:', error);
      throw error;
    }
  }

  // Clear all items
  static async clearAllItems(listId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('shopping_list_id', listId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing all items:', error);
      throw error;
    }
  }
}