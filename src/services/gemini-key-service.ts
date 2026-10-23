import { apiFetch } from '../lib/apiConfig';

export interface GeminiApiKeyRecord {
  id: string;
  keyName: string;
  apiKey: string;
  modelDefault: string;
  isDefault: boolean;
  createdAt: string;
}

export const geminiKeyService = {
  async getKeys(): Promise<GeminiApiKeyRecord[]> {
    try {
      const res = await apiFetch('gemini-keys.php', {}, 0);
      if (res && res.success && Array.isArray(res.keys)) {
        return res.keys;
      }
    } catch (e) {
      console.warn('Failed fetching Gemini API keys:', e);
    }
    return [];
  },

  async addKey(data: { keyName: string; apiKey: string; modelDefault?: string; isDefault?: boolean }): Promise<boolean> {
    try {
      const res = await apiFetch('gemini-keys.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_key',
          key_name: data.keyName,
          api_key: data.apiKey,
          model_default: data.modelDefault || 'gemini-3.8-flash',
          is_default: data.isDefault ? 1 : 0
        })
      });
      return res && res.success === true;
    } catch (e) {
      console.warn('Failed adding Gemini API key:', e);
      return false;
    }
  },

  async setDefault(id: string): Promise<boolean> {
    try {
      const res = await apiFetch('gemini-keys.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'set_default',
          id
        })
      });
      return res && res.success === true;
    } catch (e) {
      console.warn('Failed setting default Gemini key:', e);
      return false;
    }
  },

  async deleteKey(id: string): Promise<boolean> {
    try {
      const res = await apiFetch('gemini-keys.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_key',
          id
        })
      });
      return res && res.success === true;
    } catch (e) {
      console.warn('Failed deleting Gemini API key:', e);
      return false;
    }
  }
};
