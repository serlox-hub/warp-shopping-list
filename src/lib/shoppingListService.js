import { supabase } from './supabase'
import { getDefaultAisleColor } from '@/types/shoppingList'

export class ShoppingListService {
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

  static async getActiveShoppingList(userId) {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
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

  static async getActiveShoppingListWithItems(userId) {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          shopping_items (
            *,
            aisle:user_aisles (
              id,
              name,
              color,
              display_order
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('shopping_items.active', true)
        .order('created_at', { foreignTable: 'shopping_items', ascending: false })
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const newList = await this.createShoppingList(userId, 'My Shopping List', true);
          return {
            list: newList,
            items: []
          };
        }
        throw error;
      }

      const { shopping_items, ...listData } = data;

      return {
        list: listData,
        items: shopping_items || []
      };
    } catch (error) {
      console.error('Error getting active shopping list with items:', error);
      throw error;
    }
  }

  static async createShoppingList(userId, name, setAsActive = false) {
    try {
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

  static async setActiveList(userId, listId) {
    try {
      await this.deactivateAllLists(userId);

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

  static async deleteShoppingList(userId, listId) {
    try {
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

  static async addShoppingItem(listId, userId, itemData) {
    try {
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

  static async deleteShoppingItem(itemId) {
    try {
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

  static async clearCompletedItems(listId) {
    try {
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

  static async clearAllItems(listId) {
    try {
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

  static async getUserAisles(userId) {
    try {
      const { data, error } = await supabase
        .from('user_aisles')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        await this.createDefaultUserAisles(userId);
        return this.getUserAisles(userId);
      }

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

  static async updateUserAisles(userId, aisles) {
    try {
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

      for (let index = 0; index < aisles.length; index++) {
        const aisle = aisles[index];

        if (aisle.id && existingAislesMap.has(aisle.id)) {
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

      await Promise.all(operations);

      return this.getUserAisles(userId);
    } catch (error) {
      console.error('Error updating user aisles:', error);
      throw error;
    }
  }

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

  static async deleteFromPurchaseHistory(userId, itemName) {
    if (!userId || !itemName) return false;

    try {
      // Reset purchase_count to 0 for active items with this name
      // AND delete all inactive items with this name
      // This completely removes them from purchase history

      const operations = [];

      // Reset purchase_count on active items
      operations.push(
        supabase
          .from('shopping_items')
          .update({
            purchase_count: 0,
            last_purchased_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('name', itemName)
          .eq('active', true)
      );

      // Delete inactive items
      operations.push(
        supabase
          .from('shopping_items')
          .delete()
          .eq('user_id', userId)
          .eq('name', itemName)
          .eq('active', false)
      );

      const results = await Promise.all(operations);

      // Check for errors in any operation
      for (const result of results) {
        if (result.error) throw result.error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting from purchase history:', error);
      throw error;
    }
  }
}
