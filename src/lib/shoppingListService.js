import { supabase } from './supabase'
import { getDefaultAisleColor } from '@/types/shoppingList'

// Table structures needed in Supabase:
//
// shopping_lists table:
// - id: uuid (primary key)
// - user_id: uuid (foreign key to auth.users)
// - name: text
// - is_active: boolean
// - list_order: integer
// - created_at: timestamp
// - updated_at: timestamp
//
// user_aisles table:
// - id: uuid (primary key)
// - user_id: uuid (foreign key to auth.users)
// - name: text
// - display_order: integer
// - color: text (hex)
// - created_at: timestamp
// - updated_at: timestamp
//
// shopping_items table:
// - id: uuid (primary key)
// - shopping_list_id: uuid (foreign key to shopping_lists)
// - user_id: uuid (foreign key to auth.users)
// - name: text
// - aisle_id: uuid (foreign key to user_aisles, nullable)
// - quantity: integer
// - completed: boolean
// - purchase_count: integer (auto-incremented when completed)
// - comment: text (optional)
// - created_at: timestamp
// - updated_at: timestamp
// - last_purchased_at: timestamp (nullable)

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

  // Get all active items for a shopping list with aisle info
  static async getShoppingItems(listId) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select(`
          *,
          aisle:user_aisles (
            id,
            name,
            color,
            display_order
          )
        `)
        .eq('shopping_list_id', listId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting shopping items:', error);
      throw error;
    }
  }

  // Add a new shopping item
  // itemData should contain: { name, aisle_id, quantity, comment }
  static async addShoppingItem(listId, userId, itemData) {
    try {
      // Check if there's an inactive item with the same name that we can reactivate
      const { data: existingItem } = await supabase
        .from('shopping_items')
        .select(`
          *,
          aisle:user_aisles (
            id,
            name,
            color,
            display_order
          )
        `)
        .eq('shopping_list_id', listId)
        .eq('user_id', userId)
        .eq('name', itemData.name)
        .eq('active', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If we found an inactive item, reactivate it
      if (existingItem) {
        const { data, error } = await supabase
          .from('shopping_items')
          .update({
            active: true,
            aisle_id: itemData.aisle_id || existingItem.aisle_id,
            quantity: itemData.quantity || 1,
            comment: itemData.comment || '',
            completed: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id)
          .select(`
            *,
            aisle:user_aisles (
              id,
              name,
              color,
              display_order
            )
          `)
          .single();

        if (error) throw error;
        return data;
      }

      // Otherwise, create a new item
      const { data, error } = await supabase
        .from('shopping_items')
        .insert([
          {
            shopping_list_id: listId,
            user_id: userId,
            name: itemData.name,
            aisle_id: itemData.aisle_id || null,
            quantity: itemData.quantity || 1,
            comment: itemData.comment || '',
            completed: false,
            purchase_count: 0,
            active: true
          }
        ])
        .select(`
          *,
          aisle:user_aisles (
            id,
            name,
            color,
            display_order
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding shopping item:', error);
      throw error;
    }
  }

  // Update a shopping item
  // updates can contain: { name, aisle_id, quantity, comment, completed }
  static async updateShoppingItem(itemId, updates) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select(`
          *,
          aisle:user_aisles (
            id,
            name,
            color,
            display_order
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shopping item:', error);
      throw error;
    }
  }

  // Delete a shopping item (soft delete)
  static async deleteShoppingItem(itemId) {
    try {
      // Soft delete: mark as inactive instead of deleting
      const { error } = await supabase
        .from('shopping_items')
        .update({
          active: false,
          updated_at: new Date().toISOString()
        })
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
      // Soft delete: mark completed items as inactive instead of deleting
      const { error } = await supabase
        .from('shopping_items')
        .update({
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('shopping_list_id', listId)
        .eq('completed', true)
        .eq('active', true);

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
      // Soft delete: mark all items as inactive instead of deleting
      const { error } = await supabase
        .from('shopping_items')
        .update({
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('shopping_list_id', listId)
        .eq('active', true);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing all items:', error);
      throw error;
    }
  }

  // ============== USER AISLES METHODS ==============

  // Get user's custom aisles
  static async getUserAisles(userId) {
    try {
      const { data, error } = await supabase
        .from('user_aisles')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // If user has no aisles, create default ones
      if (!data || data.length === 0) {
        await this.createDefaultUserAisles(userId);
        return this.getUserAisles(userId);
      }

      // Return full aisle objects including id
      return data.map(aisle => ({
        id: aisle.id,
        name: aisle.name,
        color: aisle.color || getDefaultAisleColor(aisle.name),
        display_order: aisle.display_order
      }));
    } catch (error) {
      console.error('Error getting user aisles:', error);
      throw error;
    }
  }

  // Create default aisles for new user
  static async createDefaultUserAisles(userId) {
    try {
      const { error } = await supabase.rpc('create_default_user_aisles', {
        p_user_id: userId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating default user aisles:', error);
      throw error;
    }
  }

  // Update user's aisles (intelligent UPSERT - preserves IDs and FK relationships)
  // aisles: array of { id?, name, color?, display_order? }
  // - If aisle has id: UPDATE that aisle (allows renaming!)
  // - If aisle has no id: INSERT new aisle
  // - Aisles not in the array: DELETE
  static async updateUserAisles(userId, aisles) {
    try {
      // Get existing aisles
      const { data: existingAisles, error: fetchError } = await supabase
        .from('user_aisles')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const existingAislesMap = new Map(
        (existingAisles || []).map(aisle => [aisle.id, aisle])
      );

      const incomingAisleIds = new Set(
        aisles.filter(a => a.id).map(a => a.id)
      );

      const operations = [];

      // Process incoming aisles: update existing (by ID) or insert new
      for (let index = 0; index < aisles.length; index++) {
        const aisle = aisles[index];

        if (aisle.id && existingAislesMap.has(aisle.id)) {
          // Update existing aisle (can change name, color, order)
          const existing = existingAislesMap.get(aisle.id);
          operations.push(
            supabase
              .from('user_aisles')
              .update({
                name: aisle.name,
                color: aisle.color || existing.color || getDefaultAisleColor(aisle.name),
                display_order: aisle.display_order ?? index + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', aisle.id)
          );
        } else {
          // Insert new aisle (no id, or id not found)
          operations.push(
            supabase
              .from('user_aisles')
              .insert({
                user_id: userId,
                name: aisle.name,
                color: aisle.color || getDefaultAisleColor(aisle.name),
                display_order: aisle.display_order ?? index + 1
              })
          );
        }
      }

      // Delete aisles that are no longer in the list
      const aislesToDelete = existingAisles.filter(
        existing => !incomingAisleIds.has(existing.id)
      );

      if (aislesToDelete.length > 0) {
        const idsToDelete = aislesToDelete.map(a => a.id);
        operations.push(
          supabase
            .from('user_aisles')
            .delete()
            .in('id', idsToDelete)
        );
      }

      // Execute all operations
      await Promise.all(operations);

      // Fetch and return updated aisles
      return this.getUserAisles(userId);
    } catch (error) {
      console.error('Error updating user aisles:', error);
      throw error;
    }
  }

  // ============== ITEM USAGE ANALYTICS ==============

  // Get most purchased items (based on purchase_count in shopping_items)
  static async getMostPurchasedItems(userId, limit = 8) {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select(`
          id,
          name,
          quantity,
          purchase_count,
          last_purchased_at,
          aisle:user_aisles (
            id,
            name,
            color
          )
        `)
        .eq('user_id', userId)
        .gt('purchase_count', 0)
        .order('purchase_count', { ascending: false })
        .order('last_purchased_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching most purchased items:', error);
      return [];
    }
  }
}
