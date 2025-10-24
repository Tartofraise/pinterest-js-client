import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { StealthManager } from './utils/stealth';
import { Logger, LogLevel } from './utils/logger';
import { PinterestOptions } from './types';

export class CoreManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private stealth: StealthManager;
  private options: PinterestOptions;
  private cookiesPath: string;
  private isLoggedIn: boolean = false;
  private logger: Logger;

  constructor(options: PinterestOptions = {}) {
    this.options = {
      headless: false,
      timeout: 30000,
      slowMo: 100,
      useFingerprintSuite: true,
      viewport: { width: 1920, height: 1080 },
      logLevel: LogLevel.INFO,
      ...options,
    };
    this.logger = new Logger('CoreManager', this.options.logLevel);
    this.stealth = new StealthManager();
    this.cookiesPath = path.join(process.cwd(), 'cookies.json');
  }

  /**
   * Initialize the browser and create context
   * Returns boolean indicating if user is already logged in
   */
  async init(): Promise<boolean> {
    this.logger.info('Initializing Pinterest client...');
    
    const launchOptions: any = {
      headless: this.options.headless,
      slowMo: this.options.slowMo,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        '--disable-gpu',
      ],
    };

    if (this.options.userDataDir) {
      launchOptions.userDataDir = this.options.userDataDir;
      this.logger.debug('Using custom user data directory:', this.options.userDataDir);
    }

    if (this.options.proxy) {
      launchOptions.proxy = this.options.proxy;
      this.logger.debug('Using proxy:', this.options.proxy.server);
    }

    this.logger.debug('Launching browser...');
    this.browser = await chromium.launch(launchOptions);

    this.logger.debug('Creating browser context...');
    if (this.options.useFingerprintSuite) {
      this.context = await this.stealth.createStealthContext(this.browser);
      this.logger.debug('Created stealth context with fingerprint suite');
    } else {
      this.context = await this.browser.newContext({
        viewport: this.options.viewport,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      this.logger.debug('Created standard context');
    }

    // Load cookies VERY EARLY - before page creation for maximum effectiveness
    await this.loadCookies();

    this.logger.debug('Creating new page...');
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.options.timeout!);

    // Apply stealth techniques
    await this.stealth.applyStealthToPage(this.page);
    this.logger.debug('Applied stealth techniques to page');

    // Check if already authenticated
    await this.checkAuthentication();

    this.logger.info('Pinterest client initialized successfully');
    this.logger.info(`User is ${this.isLoggedIn ? 'logged in' : 'not logged in'}`);

    return this.isLoggedIn;
  }

  /**
   * Check if user is authenticated by visiting Pinterest homepage
   */
  private async checkAuthentication(): Promise<void> {
    if (!this.page) return;

    try {
      this.logger.debug('Checking authentication status...');
      await this.page.goto('https://www.pinterest.com/', { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      const currentUrl = this.page.url();
      this.logger.debug('Current URL after navigation:', currentUrl);
      
      // Check if we're on the homepage (logged in) or redirected to login
      if (currentUrl.includes('/today') || 
          currentUrl === 'https://www.pinterest.com/' ||
          currentUrl === 'https://www.pinterest.com') {
        this.logger.info('User appears to be logged in (cookies valid)');
        this.isLoggedIn = true;
      } else if (currentUrl.includes('/login')) {
        this.logger.info('User not logged in (redirected to login page)');
        this.isLoggedIn = false;
      } else {
        this.logger.debug('Current URL:', currentUrl);
        // If we're not redirected to login and not on home, assume logged in
        this.isLoggedIn = !currentUrl.includes('/login');
      }
    } catch (error) {
      this.logger.warn('Could not determine authentication status:', error);
      this.isLoggedIn = false;
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(screenshotPath: string): Promise<void> {
    if (!this.page) throw new Error('Client not initialized');
    this.logger.debug('Taking screenshot to:', screenshotPath);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.logger.info(`Screenshot saved to: ${screenshotPath}`);
  }

  /**
   * Get current page
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Check if currently logged in
   */
  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  /**
   * Set login state (for auth manager to update)
   */
  setLoggedIn(state: boolean): void {
    this.isLoggedIn = state;
    this.logger.debug('Login state updated to:', state);
  }

  /**
   * Save cookies to file
   */
  async saveCookies(): Promise<void> {
    if (!this.context) return;
    
    try {
      const cookies = await this.context.cookies();
      fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
      this.logger.info(`Cookies saved (${cookies.length} cookies)`);
    } catch (error) {
      this.logger.error('Error saving cookies:', error);
    }
  }

  /**
   * Load cookies from file
   */
  private async loadCookies(): Promise<void> {
    if (!this.context) return;
    
    try {
      if (fs.existsSync(this.cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(this.cookiesPath, 'utf-8'));
        await this.context.addCookies(cookies);
        this.logger.info(`Cookies loaded from file (${cookies.length} cookies)`);
      } else {
        this.logger.debug('No cookies file found, starting fresh');
      }
    } catch (error) {
      this.logger.error('Error loading cookies:', error);
    }
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    this.logger.info('Closing Pinterest client...');
    
    if (this.page) {
      await this.page.close();
      this.logger.debug('Page closed');
    }
    
    if (this.context) {
      await this.context.close();
      this.logger.debug('Context closed');
    }
    
    if (this.browser) {
      await this.browser.close();
      this.logger.debug('Browser closed');
    }
    
    this.logger.info('Pinterest client closed');
  }

  /**
   * Get stealth manager
   */
  getStealth(): StealthManager {
    return this.stealth;
  }

  /**
   * Get options
   */
  getOptions(): PinterestOptions {
    return this.options;
  }

  /**
   * Get logger
   */
  getLogger(): Logger {
    return this.logger;
  }
}
