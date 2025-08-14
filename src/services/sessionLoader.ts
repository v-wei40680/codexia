import { invoke } from '@tauri-apps/api/core';
import { useConversationStore } from '@/stores/ConversationStore';
import type { Conversation } from '@/types/chat';

class SessionLoaderService {
  async loadSessionsFromDisk(): Promise<Conversation[]> {
    try {
      console.log('Loading sessions from disk using Rust backend...');
      const conversations = await invoke<Conversation[]>('load_sessions_from_disk');
      console.log(`Loaded ${conversations.length} conversations from disk`);
      return conversations;
    } catch (error) {
      console.error('Error loading sessions from disk:', error);
      return [];
    }
  }

  async toggleFavorite(conversationId: string): Promise<void> {
    try {
      const { conversations, toggleFavorite } = useConversationStore.getState();
      
      // Check if conversation is already in store (favorited)
      const existingConv = conversations.find(c => c.id === conversationId);
      
      if (existingConv) {
        // If already favorited, toggle it (remove from favorites)
        toggleFavorite(conversationId);
      } else {
        // If not favorited, load from disk and add to favorites
        const diskSessions = await this.loadSessionsFromDisk();
        const sessionToFavorite = diskSessions.find(s => s.id === conversationId);
        
        if (sessionToFavorite) {
          // Add to store as favorite
          useConversationStore.setState(state => ({
            conversations: [{
              ...sessionToFavorite,
              isFavorite: true
            }, ...state.conversations]
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  async isConversationFavorited(conversationId: string): Promise<boolean> {
    const { conversations } = useConversationStore.getState();
    return conversations.some(c => c.id === conversationId && c.isFavorite);
  }
}

export const sessionLoader = new SessionLoaderService();