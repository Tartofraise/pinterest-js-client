/**
 * Pinterest Automation Client with TypeScript and Playwright
 * Includes undetected features and fingerprint-suite integration
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { StealthManager } from './utils/stealth';
import {
  PinterestOptions,
  PinData,
  BoardData,
  SearchOptions,
  UserProfile,
  Pin,
  Board,
  BoardContent,
  BoardSection,
  CommentData,
  MessageData,
  LoginCredentials,
} from './types';

export class PinterestClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private stealth: StealthManager;
  private options: PinterestOptions;
  private isLoggedIn: boolean = false;
  private cookiesPath: string;

  constructor(options: PinterestOptions = {}) {
    this.options = {
      headless: false,
      timeout: 30000,
      slowMo: 100,
      useFingerprintSuite: true,
      viewport: { width: 1920, height: 1080 },
      ...options,
    };
    this.stealth = new StealthManager();
    this.cookiesPath = path.join(process.cwd(), 'cookies.json');
  }

  /**
   * Initialize the browser and create context
   */
  async init(): Promise<void> {
    console.log('Initializing Pinterest client...');
    
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
    }

    if (this.options.proxy) {
      launchOptions.proxy = this.options.proxy;
    }

    this.browser = await chromium.launch(launchOptions);

    // Create stealth context if fingerprint suite is enabled
    if (this.options.useFingerprintSuite) {
      this.context = await this.stealth.createStealthContext(this.browser);
    } else {
      this.context = await this.browser.newContext({
        viewport: this.options.viewport,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
    }

    // Load cookies if they exist
    await this.loadCookies();

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.options.timeout!);

    // Apply stealth techniques
    await this.stealth.applyStealthToPage(this.page);

    console.log('Pinterest client initialized successfully');
  }

  /**
   * Login to Pinterest
   */
  async login(email?: string, password?: string): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized. Call init() first.');

    const loginEmail = email || this.options.email;
    const loginPassword = password || this.options.password;

    if (!loginEmail || !loginPassword) {
      throw new Error('Email and password are required for login');
    }

    console.log('Logging in to Pinterest...');

    try {
      await this.page.goto('https://www.pinterest.com/login/', { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Check if already logged in
      const currentUrl = this.page.url();
      if (currentUrl.includes('/today') || currentUrl === 'https://www.pinterest.com/') {
        console.log('Already logged in!');
        this.isLoggedIn = true;
        await this.saveCookies();
        return true;
      }

      // Fill email
      const emailInput = 'input[name="id"], input[id="email"], input[type="email"]';
      await this.page.waitForSelector(emailInput, { timeout: 10000 });
      await this.stealth.humanType(this.page, emailInput, loginEmail);
      await this.stealth.randomDelay(500, 1000);

      // Fill password
      const passwordInput = 'input[name="password"], input[id="password"], input[type="password"]';
      await this.page.waitForSelector(passwordInput, { timeout: 10000 });
      await this.stealth.humanType(this.page, passwordInput, loginPassword);
      await this.stealth.randomDelay(500, 1000);

      // Click login button
      const loginButton = 'button[type="submit"], button[data-test-id="registerFormSubmitButton"]';
      await this.page.click(loginButton);
      
      // Wait for either navigation or error messages to appear
      await this.stealth.randomDelay(3000, 4000);

      // Check if we're still on the login page (login failed) or navigated away (login succeeded)
      const afterClickUrl = this.page.url();
      const stillOnLoginPage = afterClickUrl.includes('/login');

      if (stillOnLoginPage) {
        // If still on login page, check for error messages
        const errorMessages = await this.page.evaluate(() => {
          const errors: string[] = [];
          
          // Check for email error
          const emailError = document.querySelector('span#email-error, span.MFi[id="email-error"]');
          if (emailError && emailError.textContent) {
            errors.push(`Email Error: ${emailError.textContent.trim()}`);
          }
          
          // Check for password error
          const passwordError = document.querySelector('span#password-error, span.MFi[id="password-error"]');
          if (passwordError && passwordError.textContent) {
            errors.push(`Password Error: ${passwordError.textContent.trim()}`);
          }
          
          // Check for general error messages
          const generalErrors = document.querySelectorAll('.MFi, [class*="error"]');
          generalErrors.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 200) {
              // Avoid duplicates
              if (!errors.some(e => e.includes(text))) {
                errors.push(text);
              }
            }
          });
          
          return errors;
        });

        // If there are error messages, login failed
        if (errorMessages.length > 0) {
          console.error('❌ Login failed with errors:');
          errorMessages.forEach(err => console.error('  -', err));
          return false;
        }
        
        // Still on login page but no errors - might be loading
        console.log('⏳ Still on login page, waiting for navigation...');
        await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      }

      // Wait a bit more for page to settle
      await this.stealth.randomDelay(1000, 2000);

      // Verify login by checking URL
      const finalUrl = this.page.url();
      if (finalUrl.includes('/today') || finalUrl === 'https://www.pinterest.com/' || !finalUrl.includes('/login')) {
        console.log('✅ Login successful!');
        this.isLoggedIn = true;
        await this.saveCookies();
        return true;
      } else {
        console.log('❌ Login may have failed. Please check manually.');
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return false;
    }
  }

  /**
   * Create a new pin
   */
  async createPin(pinData: PinData): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log('Creating pin...');

    try {
      // Navigate to pin builder
      await this.page.goto('https://www.pinterest.com/pin-builder/', { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Upload image
      if (pinData.imageFile) {
        const fileInput = 'input[type="file"][data-test-id^="media-upload-input"]';
        await this.page.waitForSelector(fileInput, { timeout: 10000 });
        await this.page.setInputFiles(fileInput, pinData.imageFile);
        await this.stealth.randomDelay(2000, 3000);
      }

      // Fill title
      if (pinData.title) {
        const titleInput = 'textarea[id^="pin-draft-title"]';
        await this.page.waitForSelector(titleInput, { timeout: 10000 });
        await this.page.click(titleInput);
        await this.stealth.randomDelay(200, 400);
        await this.page.fill(titleInput, pinData.title);
        await this.stealth.randomDelay(500, 1000);
      }

      // Fill description - use Tab to navigate naturally, then type
      if (pinData.description) {
        // Press Tab to move from title to description field
        await this.page.keyboard.press('Tab');
        await this.stealth.randomDelay(300, 500);
        
        // Type the description
        await this.page.keyboard.type(pinData.description, { delay: 50 });
        await this.stealth.randomDelay(500, 1000);
      }

      // Fill link
      if (pinData.link) {
        const linkInput = 'textarea[id^="pin-draft-link"]';
        await this.page.waitForSelector(linkInput, { timeout: 5000 });
        await this.page.click(linkInput);
        await this.stealth.randomDelay(200, 400);
        await this.page.fill(linkInput, pinData.link);
        await this.stealth.randomDelay(500, 1000);
      }

      // Select board and publish
      if (pinData.boardName) {
        const boardSelector = '[data-test-id="board-dropdown-select-button"]';
        await this.page.click(boardSelector);
        await this.stealth.randomDelay(500, 1000);
        
        // Search for board
        const boardSearchInput = '#pickerSearchField';
        await this.page.waitForSelector(boardSearchInput, { timeout: 5000 });
        await this.page.fill(boardSearchInput, pinData.boardName);
        await this.stealth.randomDelay(1000, 1500);
        
        // Click the publish button in the specific board row
        const boardRowSelector = `[data-test-id="board-row-${pinData.boardName}"] [data-test-id="board-row-save-button-container"] button`;
        await this.page.waitForSelector(boardRowSelector, { timeout: 5000 });
        await this.page.click(boardRowSelector);
        await this.stealth.randomDelay(2000, 3000);
      } else {
        // No board specified, use the main publish button
        const publishButton = '[data-test-id="board-dropdown-save-button"]';
        await this.page.waitForSelector(publishButton, { timeout: 10000 });
        await this.page.click(publishButton);
        await this.stealth.randomDelay(2000, 3000);
      }

      console.log('Pin created successfully!');
      return true;
    } catch (error) {
      console.error('Error creating pin:', error);
      return false;
    }
  }

  /**
   * Create a new board
   */
  async createBoard(boardData: BoardData): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log('Creating board...');

    try {
      await this.page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Click create board
      await this.page.click('div[data-test-id="create-board-button"], button:has-text("Create board")').catch(() => {});
      await this.stealth.randomDelay(1000, 1500);

      // Fill board name
      const nameInput = 'input[id="boardName"], input[placeholder*="name" i]';
      await this.page.waitForSelector(nameInput, { timeout: 10000 });
      await this.stealth.humanType(this.page, nameInput, boardData.name);
      await this.stealth.randomDelay(500, 1000);

      // Fill description if provided
      if (boardData.description) {
        const descInput = 'textarea[placeholder*="description" i]';
        const descField = await this.page.$(descInput);
        if (descField) {
          await this.stealth.humanType(this.page, descInput, boardData.description);
          await this.stealth.randomDelay(500, 1000);
        }
      }

      // Create board
      const createButton = 'button[data-test-id="create-board-submit-button"], button:has-text("Create")';
      await this.page.click(createButton);
      await this.stealth.randomDelay(2000, 3000);

      console.log('Board created successfully!');
      return true;
    } catch (error) {
      console.error('Error creating board:', error);
      return false;
    }
  }

  /**
   * Repin (save) a pin to a board
   */
  async repin(pinUrl: string, boardName?: string): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log('Repinning...');

    try {
      await this.page.goto(pinUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Click save button
      const saveButton = 'button[data-test-id="pin-save-button"], button:has-text("Save")';
      await this.page.click(saveButton);
      await this.stealth.randomDelay(1000, 1500);

      // Select board if specified
      if (boardName) {
        const boardSelector = `div[data-test-id="board-row"]:has-text("${boardName}")`;
        await this.page.click(boardSelector).catch(() => {});
      } else {
        // Click first board
        await this.page.click('div[data-test-id="board-row"]').catch(() => {});
      }
      
      await this.stealth.randomDelay(2000, 3000);

      console.log('Repin successful!');
      return true;
    } catch (error) {
      console.error('Error repinning:', error);
      return false;
    }
  }

  /**
   * Follow a user
   */
  async followUser(username: string): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log(`Following user: ${username}...`);

    try {
      await this.page.goto(`https://www.pinterest.com/${username}/`, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Click follow button (data-test-id is on parent div, not button itself)
      const followButton = '[data-test-id="user-follow-button"] button';
      await this.page.waitForSelector(followButton, { timeout: 10000 });
      await this.page.click(followButton);
      await this.stealth.randomDelay(1000, 2000);

      console.log('User followed successfully!');
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(username: string): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log(`Unfollowing user: ${username}...`);

    try {
      await this.page.goto(`https://www.pinterest.com/${username}/`, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Click unfollow button (button shows "Following" or "Abonné" when already following)
      const unfollowButton = '[data-test-id="user-follow-button"] button';
      await this.page.waitForSelector(unfollowButton, { timeout: 10000 });
      
      // Check if already following by checking button state
      const isFollowing = await this.page.evaluate(() => {
        const button = document.querySelector('[data-test-id="user-follow-button"] button');
        const text = button?.textContent?.toLowerCase() || '';
        const ariaPressed = button?.getAttribute('aria-pressed');
        return ariaPressed === 'true' || text.includes('following') || text.includes('abonné');
      });

      if (!isFollowing) {
        console.log('User is not being followed');
        return false;
      }

      await this.page.click(unfollowButton);
      await this.stealth.randomDelay(500, 1000);

      // Some languages may show a confirmation dialog, try to click unfollow confirmation
      const confirmButton = await this.page.$('button:has-text("Unfollow"), button:has-text("Se désabonner"), button:has-text("Dejar de seguir")');
      if (confirmButton) {
        await confirmButton.click();
      }
      await this.stealth.randomDelay(1000, 2000);

      console.log('User unfollowed successfully!');
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  /**
   * Follow a board
   */
  async followBoard(boardUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log('Following board...');

    try {
      await this.page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Board follow button is in a dropdown menu
      // First, click the "more board options" button (three dots)
      const moreOptionsButton = '[data-test-id="more-board-options"] button';
      await this.page.waitForSelector(moreOptionsButton, { timeout: 10000 });
      await this.page.click(moreOptionsButton);
      await this.stealth.randomDelay(500, 1000);

      // Wait for menu to appear
      await this.page.waitForSelector('[role="menu"]', { timeout: 5000 });
      await this.stealth.randomDelay(300, 600);

      // Find and click the follow button in the menu
      // Look for button in menu with follow-related text (language-agnostic approach)
      const followClicked = await this.page.evaluate(() => {
        const menuButtons = document.querySelectorAll('[role="menu"] button[role="menuitem"]');
        for (const button of menuButtons) {
          const text = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          // Check if it's the follow button (contains follow-related text in various languages)
          if (text.includes('follow') || text.includes('abonner') || text.includes('seguir') || text.includes('folgen') ||
              ariaLabel.includes('follow') || ariaLabel.includes('abonner') || ariaLabel.includes('seguir')) {
            (button as HTMLElement).click();
            return true;
          }
        }
        // Fallback: click the first button in menu (usually the follow button)
        const firstButton = document.querySelector('[role="menu"] button[role="menuitem"]');
        if (firstButton) {
          (firstButton as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (!followClicked) {
        throw new Error('Follow button not found in menu');
      }

      await this.stealth.randomDelay(1000, 2000);

      console.log('Board followed successfully!');
      return true;
    } catch (error) {
      console.error('Error following board:', error);
      return false;
    }
  }

  /**
   * Search for pins, boards, or users
   */
  async search(options: SearchOptions): Promise<(Pin | Board | UserProfile)[]> {
    if (!this.page) throw new Error('Client not initialized');

    console.log(`Searching for: ${options.query}...`);

    try {
      const scope = options.scope || 'pins';
      const query = encodeURIComponent(options.query);
      
      // Build search URL based on scope
      let searchUrl: string;
      if (scope === 'people') {
        // Use 'users' endpoint for people search
        searchUrl = `https://www.pinterest.com/search/users/?q=${query}`;
        if (options.limit) {
          searchUrl += `&len=${options.limit}`;
        }
      } else {
        // For pins and boards
        searchUrl = `https://www.pinterest.com/search/${scope}/?q=${query}`;
      }
      
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(2000, 3000);

      // Scroll to load more results
      await this.stealth.humanScroll(this.page, 1000);
      await this.stealth.randomDelay(1000, 2000);

      // Extract results based on scope
      const results = await this.page.evaluate((searchScope) => {
        const items: any[] = [];
        
        if (searchScope === 'pins') {
          const pins = document.querySelectorAll('div[data-test-id="pin"]');
          pins.forEach((pin) => {
            // Get pin ID
            const pinId = pin.getAttribute('data-test-pin-id') || '';
            
            // Check if it's a sponsored/ad pin by structure (data-test-id="otpp" = One-Tap Promoted Pin)
            const isSponsored = !!pin.querySelector('[data-test-id="otpp"], [data-test-id="one-tap-desktop"]');
            
            // Get main link - try regular pin first, then ad pin structure
            let linkEl = pin.querySelector('a[href^="/pin/"]') as HTMLAnchorElement;
            
            // For ad pins, look in the one-tap structure
            if (!linkEl) {
              linkEl = pin.querySelector('[data-test-id="otpp"] a, [data-test-id="one-tap-desktop"] a') as HTMLAnchorElement;
            }
            
            const link = linkEl?.href || '';
            
            // Get title - try multiple sources
            let title = '';
            
            // 1. Try to get from pinrep-footer-organic-title (regular pins)
            const titleEl = pin.querySelector('[data-test-id="pinrep-footer-organic-title"] a');
            if (titleEl?.textContent) {
              title = titleEl.textContent.trim().replace(/^"|"$/g, ''); // Remove surrounding quotes
            }
            
            // 2. Try ad pin title (look for content in footer area for sponsored pins)
            if (!title && isSponsored) {
              // Get all text from pinrep-footer area, but exclude short texts (likely labels)
              const footerTexts = pin.querySelectorAll('[data-test-id="pinrep-footer"] .CWH, [data-test-id="pinrep-footer"] .gxb');
              for (const el of footerTexts) {
                const text = el.textContent?.trim() || '';
                // Skip if it's too short (likely a label), contains domain, or is empty
                if (text.length > 20 && !text.match(/^[\w.-]+\.(com|fr|net|org|io)/)) {
                  title = text;
                  break;
                }
              }
              
              // Fallback: look in one-tap area
              if (!title) {
                const oneTapContent = pin.querySelector('[data-test-id="one-tap-desktop"]');
                if (oneTapContent) {
                  const allTexts = Array.from(oneTapContent.querySelectorAll('div, span'))
                    .map(el => el.textContent?.trim())
                    .filter(text => text && text.length > 20 && !text.match(/^[\w.-]+\.(com|fr|net|org|io)/));
                  if (allTexts.length > 0) {
                    title = allTexts[0] || '';
                  }
                }
              }
            }
            
            // 3. Fallback to aria-label extraction
            if (!title && linkEl) {
              const ariaLabel = linkEl.getAttribute('aria-label') || '';
              // Try to extract content after common pin page prefixes (language-agnostic)
              const afterColon = ariaLabel.split(':').slice(1).join(':').trim();
              const afterQuote = ariaLabel.match(/"([^"]+)"/);
              
              if (afterQuote && afterQuote[1]) {
                title = afterQuote[1];
              } else if (afterColon && afterColon.length > 5 && !afterColon.match(/^[\w.-]+\.(com|fr|net|org|io)/)) {
                title = afterColon;
              }
            }
            
            // Get image
            const img = pin.querySelector('img')?.src || pin.querySelector('video')?.poster || '';
            const imgAlt = pin.querySelector('img')?.alt || '';
            
            // Check if it's a video pin by structure
            const isVideo = !!pin.querySelector('[data-test-id="pinrep-video"]');
            const videoDuration = pin.querySelector('[data-test-id="PinTypeIdentifier"]')?.textContent?.trim() || '';
            
            // Get advertiser name for sponsored pins
            let advertiser = '';
            if (isSponsored) {
              // Look for advertiser in footer links
              const footerLinks = pin.querySelectorAll('[data-test-id="pinrep-footer"] a');
              for (const link of footerLinks) {
                const text = link.textContent?.trim() || '';
                // Get shortest non-empty text that's not too long (likely the brand name)
                if (text.length > 2 && text.length < 50 && !text.match(/^[\w.-]+\.(com|fr|net|org|io)/)) {
                  // Take the first short text that looks like a brand name
                  const firstLine = text.split('\n')[0].trim();
                  if (firstLine.length > 2 && firstLine.length < 50) {
                    advertiser = firstLine;
                    break;
                  }
                }
              }
            }
            
            items.push({ 
              type: 'pin', 
              id: pinId,
              url: link, 
              image: img, 
              title: title || imgAlt,
              isVideo: isVideo,
              videoDuration: videoDuration,
              isSponsored: isSponsored,
              advertiser: advertiser || undefined
            });
          });
        } else if (searchScope === 'boards') {
          const boards = document.querySelectorAll('div[data-test-id="board-card"]');
          boards.forEach((board) => {
            // Get board link
            const linkEl = board.querySelector('a') as HTMLAnchorElement;
            const link = linkEl?.href || '';
            
            // Get board name from h2 title or text content
            const nameEl = board.querySelector('h2');
            const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';
            
            // Get creator/owner name
            const creatorEl = board.querySelector('[data-test-id="line-clamp-wrapper"]');
            const creator = creatorEl?.textContent?.trim() || '';
            
            // Get pin count
            const pinCountEl = board.querySelector('[data-test-id="pinAndSectionCount-pin-count"]');
            const pinCountText = pinCountEl?.textContent?.trim() || '';
            // Extract just the number from text like "64 Épingles" or "64 Pins"
            const pinCountMatch = pinCountText.match(/(\d+[\d\s,]*)/);
            const pinCount = pinCountMatch ? pinCountMatch[1].replace(/\s/g, '') : '';
            
            // Get last updated time
            const timeEl = board.querySelector('[data-test-id="pinAndSectionCount-time"]');
            const lastUpdated = timeEl?.textContent?.trim() || '';
            
            // Get cover images
            const images = Array.from(board.querySelectorAll('img'))
              .map(img => img.src)
              .filter(src => src && src.includes('pinimg.com'));
            
            items.push({ 
              type: 'board', 
              url: link, 
              name: name,
              creator: creator,
              pinCount: pinCount,
              lastUpdated: lastUpdated,
              coverImages: images.slice(0, 3) // First 3 images
            });
          });
        } else if (searchScope === 'people') {
          const users = document.querySelectorAll('div[data-test-id="user-rep-with-card"], div[data-test-id="user-rep"]');
          users.forEach((user) => {
            // Get user link
            const linkEl = user.querySelector('a') as HTMLAnchorElement;
            const link = linkEl?.href || '';
            
            // Extract username from URL (e.g., "/balogunstrategydesign/" -> "balogunstrategydesign")
            const username = link.split('/').filter(Boolean).pop() || '';
            
            // Get full name from data-test-id="user-rep-name"
            const nameEl = user.querySelector('[data-test-id="user-rep-name"]');
            const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';
            
            // Get follower count
            const followersEl = user.querySelector('[data-test-id="user-rep-followers"]');
            const followersText = followersEl?.textContent?.trim() || '';
            
            // Parse follower count (language-agnostic)
            let followerCount = 0;
            const followerMatch = followersText.match(/([\d.,]+)\s*([kKmM]?)/);
            if (followerMatch) {
              let num = parseFloat(followerMatch[1].replace(',', '.').replace(/\s/g, ''));
              const suffix = followerMatch[2].toLowerCase();
              if (suffix === 'k') num *= 1000;
              else if (suffix === 'm') num *= 1000000;
              followerCount = Math.floor(num);
            }
            
            // Get avatar image
            const avatarImg = user.querySelector('img')?.src || '';
            
            // Check if already following (button text changes)
            const followButton = user.querySelector('[data-test-id="user-follow-button"] button');
            const isFollowing = followButton?.getAttribute('aria-label')?.toLowerCase().includes('following') || 
                               followButton?.getAttribute('aria-label')?.toLowerCase().includes('abonné');
            
            items.push({ 
              type: 'user', 
              url: link, 
              username: username,
              name: name,
              followerCount: followerCount,
              avatarUrl: avatarImg,
              isFollowing: isFollowing || false
            });
          });
        }
        
        return items;
      }, scope);

      console.log(`Found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('Error searching:', error);
      return [];
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(username: string): Promise<UserProfile | null> {
    if (!this.page) throw new Error('Client not initialized');

    console.log(`Getting profile for: ${username}...`);

    try {
      await this.page.goto(`https://www.pinterest.com/${username}/`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      // Wait for profile elements to load
      await this.page.waitForSelector('[data-test-id="profile-name"]', { timeout: 10000 }).catch(() => {});
      await this.stealth.randomDelay(1000, 2000);

      const profile = await this.page.evaluate(() => {
        // Profile name
        const nameElement = document.querySelector('[data-test-id="profile-name"]');
        
        // Username
        const usernameElement = document.querySelector('[data-test-id="profile-username"]');
        
        // About/bio
        const aboutElement = document.querySelector('[data-test-id="main-user-description-text"]');
        
        // Followers count
        const followersElement = document.querySelector('[data-test-id="profile-followers-count"]');
        
        // Following count
        const followingElement = document.querySelector('[data-test-id="profile-following-count"]');
        
        // Helper to parse count strings (e.g., "6.3 M followers" -> 6300000, "377 following" -> 377)
        const parseCount = (text: string): number => {
          if (!text) return 0;
          
          // Extract just the number part, handling different formats and languages
          // Examples: "6,3 M abonnés", "1.2k followers", "377 abonnements"
          const match = text.match(/[\d.,]+\s*[kKmM]?/);
          if (!match) return 0;
          
          let numStr = match[0].replace(/\s/g, '').toLowerCase();
          // Replace comma with dot for parsing (European format)
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

      return profile;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  /**
   * Like a pin
   */
  async likePin(pinUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log('Liking pin...');

    try {
      await this.page.goto(pinUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Click like/react button (heart icon)
      const likeButton = 'button[data-test-id="react-button"]';
      await this.page.click(likeButton);
      await this.stealth.randomDelay(1000, 1500);

      console.log('Pin liked successfully!');
      return true;
    } catch (error) {
      console.error('Error liking pin:', error);
      return false;
    }
  }

  /**
   * Comment on a pin
   */
  async commentOnPin(pinUrl: string, comment: string): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log('Commenting on pin...');

    try {
      await this.page.goto(pinUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Click on comment editor container (DraftJS editor)
      const editorContainer = '[data-test-id="editor-with-mentions"], [data-test-id="comment-editor-container"]';
      await this.page.waitForSelector(editorContainer, { timeout: 10000 });
      
      // Click on the contenteditable div (DraftJS editor)
      const editableDiv = '.public-DraftEditor-content[contenteditable="true"]';
      await this.page.click(editableDiv);
      await this.stealth.randomDelay(300, 600);
      
      // Type comment - DraftJS uses contenteditable, so we type directly
      await this.page.keyboard.type(comment, { delay: 100 });
      await this.stealth.randomDelay(500, 1000);

      // Click submit button (structure-based, language-agnostic)
      const submitButton = '[data-test-id="activity-item-create-submit"] button';
      try {
        await this.page.waitForSelector(submitButton, { timeout: 5000 });
        await this.page.click(submitButton);
      } catch {
        // Fallback: press Enter to submit
        await this.page.keyboard.press('Enter');
      }
      
      await this.stealth.randomDelay(2000, 3000);

      console.log('Comment posted successfully!');
      return true;
    } catch (error) {
      console.error('Error commenting:', error);
      return false;
    }
  }

  /**
   * Delete a pin
   */
  async deletePin(pinUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    console.log('Deleting pin...');

    try {
      await this.page.goto(pinUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Click options menu
      const optionsButton = 'button[data-test-id="pin-options-button"], button[aria-label*="More options" i]';
      await this.page.click(optionsButton);
      await this.stealth.randomDelay(500, 1000);

      // Click delete
      await this.page.click('div[role="menuitem"]:has-text("Delete")');
      await this.stealth.randomDelay(500, 1000);

      // Confirm delete
      await this.page.click('button:has-text("Delete")');
      await this.stealth.randomDelay(2000, 3000);

      console.log('Pin deleted successfully!');
      return true;
    } catch (error) {
      console.error('Error deleting pin:', error);
      return false;
    }
  }

  /**
   * Get pins and sections from a board
   */
  async getBoardPins(boardUrl: string, limit: number = 50): Promise<BoardContent[]> {
    if (!this.page) throw new Error('Client not initialized');

    console.log('Getting board content...');

    try {
      await this.page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Scroll to load more content
      for (let i = 0; i < 3; i++) {
        await this.stealth.humanScroll(this.page, 800);
        await this.stealth.randomDelay(1000, 1500);
      }

      const items = await this.page.evaluate((maxItems) => {
        const results: any[] = [];
        
        // 1. Get board sections (nested boards)
        const sectionElements = document.querySelectorAll('[data-test-id^="section-"]');
        sectionElements.forEach((section) => {
          const linkEl = section.querySelector('a') as HTMLAnchorElement;
          const link = linkEl?.href || '';
          
          // Get section name from h2
          const nameEl = section.querySelector('h2');
          const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';
          
          // Get pin count - extract first number found in the section text (language-agnostic)
          // Usually appears in a span after the title
          const textElements = section.querySelectorAll('span, div');
          let pinCount = '';
          for (const el of textElements) {
            const text = el.textContent?.trim() || '';
            // Look for a number pattern (digits with optional spaces/commas and k/m suffix)
            const match = text.match(/^(\d+[\d\s,]*)\s*[kKmM]?\s*\S+$/);
            if (match && match[1]) {
              pinCount = match[1].replace(/\s/g, '');
              break;
            }
          }
          
          // Get preview images
          const images = Array.from(section.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && src.includes('pinimg.com'));
          
          results.push({
            type: 'section',
            id: link.split('/').filter(Boolean).pop() || '',
            name: name,
            url: link,
            pinCount: pinCount,
            coverImages: images.slice(0, 3)
          });
        });
        
        // 2. Get pins
        const pinElements = document.querySelectorAll('div[data-test-id="pin"]');
        pinElements.forEach((pinEl) => {
          // Get pin ID
          const pinId = pinEl.getAttribute('data-test-pin-id') || '';
          
          // Get link
          const linkEl = pinEl.querySelector('a[href^="/pin/"]') as HTMLAnchorElement;
          const link = linkEl?.href || '';
          
          // Get image
          const img = pinEl.querySelector('img')?.src || pinEl.querySelector('video')?.poster || '';
          const imgAlt = pinEl.querySelector('img')?.alt || '';
          
          // Check if video and get duration
          const isVideo = !!pinEl.querySelector('[data-test-id="pinrep-video"]');
          const videoDuration = pinEl.querySelector('[data-test-id="PinTypeIdentifier"]')?.textContent?.trim() || '';
          
          // Get title if available (some pins don't have titles in board view)
          const titleEl = pinEl.querySelector('[data-test-id="pinrep-footer-organic-title"]');
          const title = titleEl?.textContent?.trim() || '';
          
          results.push({
            type: 'pin',
            id: pinId || link.split('/pin/')[1]?.split('/')[0] || '',
            title: title || imgAlt,
            imageUrl: img,
            url: link,
            link: link,
            isVideo: isVideo,
            videoDuration: videoDuration || undefined
          });
        });
        
        return results.slice(0, maxItems);
      }, limit);

      console.log(`Found ${items.length} items (sections + pins)`);
      return items;
    } catch (error) {
      console.error('Error getting board content:', error);
      return [];
    }
  }

  /**
   * Get user's boards
   */
  async getUserBoards(username: string): Promise<Board[]> {
    if (!this.page) throw new Error('Client not initialized');

    console.log(`Getting boards for user: ${username}...`);

    try {
      await this.page.goto(`https://www.pinterest.com/${username}/_saved/`, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Scroll to load more boards
      await this.stealth.humanScroll(this.page, 1000);
      await this.stealth.randomDelay(1000, 2000);

      const boards = await this.page.evaluate(() => {
        const boardElements = document.querySelectorAll('div[data-test-id="board-card"]');
        const results: any[] = [];
        
        boardElements.forEach((boardEl) => {
          const link = boardEl.querySelector('a')?.href || '';
          const name = boardEl.querySelector('h3')?.textContent || '';
          const pinCount = boardEl.querySelector('div[data-test-id="pin-count"]')?.textContent || '';
          const coverImage = boardEl.querySelector('img')?.src || '';
          
          results.push({
            id: link.split('/').filter(Boolean).pop() || '',
            name,
            url: link,
            pinCount,
            coverImage,
          });
        });
        
        return results;
      });

      console.log(`Found ${boards.length} boards`);
      return boards;
    } catch (error) {
      console.error('Error getting boards:', error);
      return [];
    }
  }

  /**
   * Save cookies to file
   */
  private async saveCookies(): Promise<void> {
    if (!this.context) return;
    
    try {
      const cookies = await this.context.cookies();
      fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('Cookies saved');
    } catch (error) {
      console.error('Error saving cookies:', error);
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
        console.log('Cookies loaded');
        this.isLoggedIn = true;
      }
    } catch (error) {
      console.error('Error loading cookies:', error);
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string): Promise<void> {
    if (!this.page) throw new Error('Client not initialized');
    await this.page.screenshot({ path, fullPage: true });
    console.log(`Screenshot saved to: ${path}`);
  }

  /**
   * Get current page
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Check if logged in
   */
  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    console.log('Closing Pinterest client...');
    
    if (this.page) {
      await this.page.close();
    }
    
    if (this.context) {
      await this.context.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('Pinterest client closed');
  }
}

