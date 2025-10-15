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
        // If no preferences exist, create default preferences
        if (error.code === 'PGRST116') {
          return this.createDefaultUserPreferences(userId);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      // Return default preferences on error
      return { theme: 'system', language: 'en' };
    }
  }

  // Update or create user preferences
  static async updateUserPreferences(userId, preferences) {
    try {
      const upsertData = { 
        user_id: userId, 
        ...preferences,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(
          upsertData,
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

  // Create default preferences for new user
  static async createDefaultUserPreferences(userId) {
    try {
      const { data, error } = await supabase.rpc('create_default_user_preferences', {
        p_user_id: userId
      });

      if (error) throw error;

      // Return the newly created preferences
      return this.getUserPreferences(userId);
    } catch (error) {
      console.error('Error creating default user preferences:', error);
      // Return default values on error
      return { theme: 'system', language: 'en' };
    }
  }

  // Update only theme preference
  static async updateTheme(userId, theme) {
    return this.updateUserPreferences(userId, { theme });
  }

  // Update only language preference
  static async updateLanguage(userId, language) {
    return this.updateUserPreferences(userId, { language });
  }

  // Migrate localStorage preferences to database
  static async migrateLocalStoragePreferences(userId, localPreferences) {
    try {
      // Check if user already has preferences in database
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      // Only migrate if user has no preferences in database
      if (!existingPrefs || existingPrefs.length === 0) {
        await this.updateUserPreferences(userId, localPreferences);
        return true;
      }
      
      return false; // No migration needed
    } catch (error) {
      console.error('Error migrating localStorage preferences:', error);
      throw error;
    }
  }
}
