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

      // Check which type of login form is present
      const otpForm = await this.page.$('form[data-test-id="otpEmailRequestForm"]').catch(() => null);
      const magicLinkForm = await this.page.$('form[data-test-id="magicLinkRequestForm"]').catch(() => null);
      const passwordInput = await this.page.$('input[type="password"]').catch(() => null);

      // If we find either OTP or magic link form (both are two-step)
      if (otpForm || magicLinkForm) {
        const formType = otpForm ? 'OTP' : 'Magic Link';
        this.logger.info(`Detected two-step login form (${formType} - email first)`);
        return await this.loginWithOTP(email, password);
      } else if (passwordInput) {
        // Password field is visible, so it's traditional login
        this.logger.info('Detected traditional email+password login form');
        return await this.loginTraditional(email, password);
      } else {
        // Try to detect by checking if there's an email field without password
        const emailTypeInput = await this.page.$('input[type="email"]').catch(() => null);
        
        if (emailTypeInput && !passwordInput) {
          this.logger.info('Detected two-step login form (no password field visible yet)');
          return await this.loginWithOTP(email, password);
        } else if (emailTypeInput && passwordInput) {
          this.logger.info('Detected traditional login form (both fields visible)');
          return await this.loginTraditional(email, password);
        } else {
          this.logger.error('Could not detect login form type');
          return false;
        }
      }
    } catch (error) {
      this.logger.error('Login error:', error);
      return false;
    }
  }

  /**
   * Traditional email + password login (both fields on same page)
   */
  private async loginTraditional(email: string, password: string): Promise<boolean> {
    try {
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

      return await this.verifyLoginSuccess();
    } catch (error) {
      this.logger.error('Traditional login error:', error);
      return false;
    }
  }

  /**
   * Two-step login (email first, then password on next page)
   */
  private async loginWithOTP(email: string, password?: string): Promise<boolean> {
    try {
      this.logger.debug('Filling email field...');
      // Support multiple form types: magic link, OTP, and generic email inputs
      const emailInputSelectors = [
        'input[id="magic link email"]',  // Magic link form
        'input[id="otp-email"]',         // OTP form
        'input[name="otp-email"]',       // OTP form alternative
        'input[name="id"]',              // Generic form
        'input[type="email"]',           // Fallback
      ];
      
      let emailInputFound = false;
      for (const selector of emailInputSelectors) {
        const input = await this.page.$(selector).catch(() => null);
        if (input) {
          this.logger.debug(`Found email input with selector: ${selector}`);
          await this.stealth.humanType(this.page, selector, email);
          emailInputFound = true;
          break;
        }
      }
      
      if (!emailInputFound) {
        this.logger.error('Could not find email input field');
        return false;
      }
      
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Clicking continue button...');
      // Find the submit button - try specific selectors first, then generic
      const continueButtonSelectors = [
        'button[data-test-id="registerFormSubmitButton"]',                // Generic submit button
        'button[data-test-id="otpEmailSubmitButton"]',                    // OTP specific
        'form[data-test-id="magicLinkRequestForm"] button[type="submit"]', // Magic link form
        'form[data-test-id="otpEmailRequestForm"] button[type="submit"]',  // OTP form
        'button[type="submit"]',                                           // Generic fallback
      ];
      
      let buttonClicked = false;
      for (const selector of continueButtonSelectors) {
        const button = await this.page.$(selector).catch(() => null);
        if (button) {
          this.logger.debug(`Found continue button with selector: ${selector}`);
          await this.page.click(selector);
          buttonClicked = true;
          break;
        }
      }
      
      if (!buttonClicked) {
        this.logger.error('Could not find continue button after email field');
        return false;
      }
      
      await this.stealth.randomDelay(3000, 4000);

      // After clicking continue, check what Pinterest shows next
      this.logger.debug('Checking what form appears after email submission...');
      
      // Check if we got an error
      const errorMessages = await this.checkForErrors();
      if (errorMessages.length > 0) {
        this.logger.error('Email submission failed:', errorMessages.join('; '));
        return false;
      }

      // Check if password field appeared
      const passwordInput = 'input[name="password"], input[id="password"], input[type="password"]';
      const passwordField = await this.page.$(passwordInput).catch(() => null);
      
      if (passwordField) {
        // Two-step traditional login: email first, then password
        this.logger.info('Password field appeared - this is a two-step traditional login');
        
        if (!password) {
          this.logger.error('Password is required but was not provided');
          return false;
        }

        this.logger.debug('Filling password field...');
        await this.page.waitForSelector(passwordInput, { timeout: 10000 });
        await this.stealth.humanType(this.page, passwordInput, password);
        await this.stealth.randomDelay(500, 1000);

        this.logger.debug('Submitting password...');
        const submitButton = 'button[type="submit"], button[data-test-id="registerFormSubmitButton"]';
        await this.page.click(submitButton);
        
        await this.stealth.randomDelay(3000, 4000);

        return await this.verifyLoginSuccess();
      } else {
        // Might be actual OTP code request or already logged in
        this.logger.warn('Password field not found after email submission');
        this.logger.info('Checking if login was successful or if OTP code is required...');
        
        // Check if we're already logged in
        const isLoggedIn = await this.verifyLoginSuccess();
        if (isLoggedIn) {
          return true;
        }
        
        // Check for OTP code input field
        const otpCodeInput = await this.page.$('input[name="otp"], input[placeholder*="code" i]').catch(() => null);
        if (otpCodeInput) {
          this.logger.error('OTP code is required but automated OTP entry is not supported');
          this.logger.error('Please use cookies-based authentication instead');
          return false;
        }
        
        this.logger.error('Unexpected state after email submission');
        return false;
      }

    } catch (error) {
      this.logger.error('Two-step login error:', error);
      return false;
    }
  }

  /**
   * Check for error messages on the page
   */
  private async checkForErrors(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const errors: string[] = [];
      
      const emailError = document.querySelector('span#email-error, span.MFi[id="email-error"], span#otp-email-error');
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
  }

  /**
   * Verify if login was successful
   */
  private async verifyLoginSuccess(): Promise<boolean> {
    const afterClickUrl = this.page.url();
    const stillOnLoginPage = afterClickUrl.includes('/login');

    if (stillOnLoginPage) {
      this.logger.debug('Still on login page, checking for errors...');
      const errorMessages = await this.checkForErrors();

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
  }
}
