/**
 * AuthManager
 * Manages automatic authentication for the Clinical Extractor
 * Auto-registers/logs in a default user to enable seamless backend integration
 */

import BackendClient from './BackendClient';
import StatusManager from '../utils/status';

const DEFAULT_USER = {
  email: 'default@clinicalextractor.local',
  password: 'clinical_extractor_default_2024'
};

class AuthManager {
  private initialized = false;

  async ensureAuthenticated(): Promise<boolean> {
    if (this.initialized && BackendClient.isAuthenticated()) {
      return true;
    }

    try {
      if (!BackendClient.isAuthenticated()) {
        try {
          await BackendClient.login(DEFAULT_USER.email, DEFAULT_USER.password);
          console.log('✅ Authenticated with backend');
        } catch (loginError: any) {
          // Prefer status code check, fallback to message if status is missing
          if ((loginError.status === 401) ||
              (loginError.response?.status === 401) ||
              (loginError.message && loginError.message.includes('Incorrect email or password'))) {
            await BackendClient.register(DEFAULT_USER.email, DEFAULT_USER.password);
            console.log('✅ Registered and authenticated with backend');
          } else {
            throw loginError;
          }
      }

      this.initialized = true;
      return true;
    } catch (error: any) {
      console.error('❌ Backend authentication failed:', error);
      StatusManager.show(
        `Backend connection failed: ${error.message}. AI features may not work.`,
        'warning',
        5000
      );
      return false;
    }
  }

  async initialize(): Promise<void> {
    await this.ensureAuthenticated();
  }
}

export default new AuthManager();
