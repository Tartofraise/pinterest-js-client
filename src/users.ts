import { Page } from 'playwright';
import { UserProfile } from './types';
import { Logger, LogLevel } from './utils/logger';
import { StealthManager } from './utils/stealth';

export class UsersManager {
  private page: Page;
  private stealth: StealthManager;
  private logger: Logger;

  constructor(page: Page, stealth: StealthManager, logLevel: LogLevel = LogLevel.INFO) {
    this.page = page;
    this.stealth = stealth;
    this.logger = new Logger('UsersManager', logLevel);
  }

  /**
   * Follow a user
   */
  async followUser(username: string): Promise<boolean> {
    this.logger.info(`Following user: ${username}`);

    try {
      await this.page.goto(`https://www.pinterest.com/${username}/`, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Clicking follow button...');
      const followButton = '[data-test-id="user-follow-button"] button';
      await this.page.waitForSelector(followButton, { timeout: 10000 });
      await this.page.click(followButton);
      await this.stealth.randomDelay(1000, 2000);

      this.logger.success('User followed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error following user:', error);
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(username: string): Promise<boolean> {
    this.logger.info(`Unfollowing user: ${username}`);

    try {
      await this.page.goto(`https://www.pinterest.com/${username}/`, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      const unfollowButton = '[data-test-id="user-follow-button"] button';
      await this.page.waitForSelector(unfollowButton, { timeout: 10000 });
      
      this.logger.debug('Checking follow status...');
      const isFollowing = await this.page.evaluate(() => {
        const button = document.querySelector('[data-test-id="user-follow-button"] button');
        const text = button?.textContent?.toLowerCase() || '';
        const ariaPressed = button?.getAttribute('aria-pressed');
        return ariaPressed === 'true' || text.includes('following') || text.includes('abonné');
      });

      if (!isFollowing) {
        this.logger.warn('User is not being followed');
        return false;
      }

      this.logger.debug('Clicking unfollow button...');
      await this.page.click(unfollowButton);
      await this.stealth.randomDelay(500, 1000);

      const confirmButton = await this.page.$('button:has-text("Unfollow"), button:has-text("Se désabonner"), button:has-text("Dejar de seguir")');
      if (confirmButton) {
        this.logger.debug('Confirming unfollow...');
        await confirmButton.click();
      }
      await this.stealth.randomDelay(1000, 2000);

      this.logger.success('User unfollowed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error unfollowing user:', error);
      return false;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(username: string): Promise<UserProfile | null> {
    this.logger.info(`Getting profile for: ${username}`);

    try {
      await this.page.goto(`https://www.pinterest.com/${username}/`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      this.logger.debug('Waiting for profile elements...');
      await this.page.waitForSelector('[data-test-id="profile-name"]', { timeout: 10000 }).catch(() => {});
      await this.stealth.randomDelay(1000, 2000);

      const profile = await this.page.evaluate(() => {
        const nameElement = document.querySelector('[data-test-id="profile-name"]');
        const usernameElement = document.querySelector('[data-test-id="profile-username"]');
        const aboutElement = document.querySelector('[data-test-id="main-user-description-text"]');
        const followersElement = document.querySelector('[data-test-id="profile-followers-count"]');
        const followingElement = document.querySelector('[data-test-id="profile-following-count"]');
        
        const parseCount = (text: string): number => {
          if (!text) return 0;
          
          const match = text.match(/[\d.,]+\s*[kKmM]?/);
          if (!match) return 0;
          
          let numStr = match[0].replace(/\s/g, '').toLowerCase();
          numStr = numStr.replace(',', '.');
          
          let multiplier = 1;
          if (numStr.includes('k')) {
            multiplier = 1000;
            numStr = numStr.replace('k', '');
          } else if (numStr.includes('m')) {
            multiplier = 1000000;
            numStr = numStr.replace('m', '');
          }
          
          const num = parseFloat(numStr);
          return isNaN(num) ? 0 : Math.floor(num * multiplier);
        };
        
        return {
          username: usernameElement?.textContent?.trim() || window.location.pathname.split('/')[1] || '',
          fullName: nameElement?.textContent?.trim() || '',
          about: aboutElement?.textContent?.trim() || '',
          followerCount: parseCount(followersElement?.textContent || ''),
          followingCount: parseCount(followingElement?.textContent || ''),
        };
      });

      this.logger.info(`Profile retrieved: ${profile.fullName || profile.username}`);
      return profile;
    } catch (error) {
      this.logger.error('Error getting profile:', error);
      return null;
    }
  }
}
