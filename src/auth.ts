import { Page } from 'playwright';
import { Logger, LogLevel } from './utils/logger';
import { StealthManager } from './utils/stealth';

export class AuthManager {
  private page: Page;
  private stealth: StealthManager;
  private logger: Logger;

  constructor(page: Page, stealth: StealthManager, logLevel: LogLevel = LogLevel.INFO) {
    this.page = page;
    this.stealth = stealth;
    this.logger = new Logger('AuthManager', logLevel);
  }

  /**
   * Login to Pinterest
   */
  async login(email: string, password: string): Promise<boolean> {
    this.logger.info('Logging in to Pinterest...');

    try {
      await this.page.goto('https://www.pinterest.com/login/', { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      const currentUrl = this.page.url();
      if (currentUrl.includes('/today') || currentUrl === 'https://www.pinterest.com/') {
        this.logger.info('Already logged in');
        return true;
      }

      this.logger.debug('Filling email field...');
      const emailInput = 'input[name="id"], input[id="email"], input[type="email"]';
      await this.page.waitForSelector(emailInput, { timeout: 10000 });
      await this.stealth.humanType(this.page, emailInput, email);
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Filling password field...');
      const passwordInput = 'input[name="password"], input[id="password"], input[type="password"]';
      await this.page.waitForSelector(passwordInput, { timeout: 10000 });
      await this.stealth.humanType(this.page, passwordInput, password);
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Submitting login form...');
      const loginButton = 'button[type="submit"], button[data-test-id="registerFormSubmitButton"]';
      await this.page.click(loginButton);
      
      await this.stealth.randomDelay(3000, 4000);

      const afterClickUrl = this.page.url();
      const stillOnLoginPage = afterClickUrl.includes('/login');

      if (stillOnLoginPage) {
        this.logger.debug('Still on login page, checking for errors...');
        const errorMessages = await this.page.evaluate(() => {
          const errors: string[] = [];
          
          const emailError = document.querySelector('span#email-error, span.MFi[id="email-error"]');
          if (emailError?.textContent) {
            errors.push(`Email Error: ${emailError.textContent.trim()}`);
          }
          
          const passwordError = document.querySelector('span#password-error, span.MFi[id="password-error"]');
          if (passwordError?.textContent) {
            errors.push(`Password Error: ${passwordError.textContent.trim()}`);
          }
          
          const generalErrors = document.querySelectorAll('.MFi, [class*="error"]');
          generalErrors.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 200) {
              if (!errors.some(e => e.includes(text))) {
                errors.push(text);
              }
            }
          });
          
          return errors;
        });

        if (errorMessages.length > 0) {
          this.logger.error('Login failed with errors:', errorMessages.join('; '));
          return false;
        }
        
        this.logger.info('Waiting for page navigation...');
        await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      }

      await this.stealth.randomDelay(1000, 2000);

      const finalUrl = this.page.url();
      if (finalUrl.includes('/today') || finalUrl === 'https://www.pinterest.com/' || !finalUrl.includes('/login')) {
        this.logger.success('Login successful');
        return true;
      } else {
        this.logger.warn('Login may have failed. Please check manually.');
        return false;
      }
    } catch (error) {
      this.logger.error('Login error:', error);
      return false;
    }
  }
}
