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
// - created_at: timestamp
// - updated_at: timestamp

export class ShoppingListService {
  // Get or create the default shopping list for a user
  static async getDefaultShoppingList(userId) {
    try {
      // First, try to get existing default list
      let { data: lists, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      // If no list exists, create one
      if (!lists || lists.length === 0) {
        const { data: newList, error: createError } = await supabase
          .from('shopping_lists')
          .insert([
            { 
              user_id: userId, 
              name: 'My Shopping List',
            }
          ])
          .select()
          .single();

        if (createError) throw createError;
        return newList;
      }

      return lists[0];
    } catch (error) {
      console.error('Error getting default shopping list:', error);
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