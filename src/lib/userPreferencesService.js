import { supabase } from './supabase'

export class UserPreferencesService {
  // Get user preferences
  static async getUserPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, return default preferences
        if (error.code === 'PGRST116') {
          return { theme: 'system' };
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      // Return default preferences on error
      return { theme: 'system' };
    }
  }

  // Update or create user preferences
  static async updateUserPreferences(userId, preferences) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(
          { 
            user_id: userId, 
            ...preferences,
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Update only theme preference
  static async updateTheme(userId, theme) {
    return this.updateUserPreferences(userId, { theme });
  }
}