import { Page } from 'playwright';
import { BoardData, Board, BoardContent } from './types';
import { Logger, LogLevel } from './utils/logger';
import { StealthManager } from './utils/stealth';

export class BoardsManager {
  private page: Page;
  private stealth: StealthManager;
  private logger: Logger;

  constructor(page: Page, stealth: StealthManager, logLevel: LogLevel = LogLevel.INFO) {
    this.page = page;
    this.stealth = stealth;
    this.logger = new Logger('BoardsManager', logLevel);
  }

  /**
   * Create a new board
   */
  async createBoard(boardData: BoardData): Promise<boolean> {
    this.logger.info('Creating board...');
    this.logger.debug('Board data:', { name: boardData.name, privacy: boardData.privacy });

    try {
      this.logger.debug('Navigating to board creation tool...');
      await this.page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Clicking create board button...');
      await this.page.click('div[data-test-id="create-board-button"], button:has-text("Create board")').catch(() => {});
      await this.stealth.randomDelay(1000, 1500);

      this.logger.debug('Filling board name...');
      const nameInput = 'input[id="boardName"], input[placeholder*="name" i]';
      await this.page.waitForSelector(nameInput, { timeout: 10000 });
      await this.stealth.humanType(this.page, nameInput, boardData.name);
      await this.stealth.randomDelay(500, 1000);

      if (boardData.description) {
        this.logger.debug('Filling board description...');
        const descInput = 'textarea[placeholder*="description" i]';
        const descField = await this.page.$(descInput);
        if (descField) {
          await this.stealth.humanType(this.page, descInput, boardData.description);
          await this.stealth.randomDelay(500, 1000);
        }
      }

      this.logger.debug('Clicking submit button...');
      const createButton = 'button[data-test-id="create-board-submit-button"], button:has-text("Create")';
      await this.page.click(createButton);
      await this.stealth.randomDelay(2000, 3000);

      this.logger.success('Board created successfully');
      return true;
    } catch (error) {
      this.logger.error('Error creating board:', error);
      return false;
    }
  }

  /**
   * Follow a board
   */
  async followBoard(boardUrl: string): Promise<boolean> {
    this.logger.info('Following board...');

    try {
      await this.page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Clicking options button...');
      const moreOptionsButton = '[data-test-id="more-board-options"] button';
      await this.page.waitForSelector(moreOptionsButton, { timeout: 10000 });
      await this.page.click(moreOptionsButton);
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Waiting for options menu...');
      await this.page.waitForSelector('[role="menu"]', { timeout: 5000 });
      await this.stealth.randomDelay(300, 600);

      this.logger.debug('Clicking follow button...');
      const followClicked = await this.page.evaluate(() => {
        const menuButtons = document.querySelectorAll('[role="menu"] button[role="menuitem"]');
        for (const button of menuButtons) {
          const text = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          if (text.includes('follow') || text.includes('abonner') || text.includes('seguir') || text.includes('folgen') ||
              ariaLabel.includes('follow') || ariaLabel.includes('abonner') || ariaLabel.includes('seguir')) {
            (button as HTMLElement).click();
            return true;
          }
        }
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
      this.logger.success('Board followed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error following board:', error);
      return false;
    }
  }

  /**
   * Get pins and sections from a board
   */
  async getBoardPins(boardUrl: string, limit: number = 50): Promise<BoardContent[]> {
    this.logger.info('Getting board content...');
    this.logger.debug('Limit:', limit);

    try {
      await this.page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Scrolling to load more content...');
      for (let i = 0; i < 3; i++) {
        await this.stealth.humanScroll(this.page, 800);
        await this.stealth.randomDelay(1000, 1500);
      }

      const items = await this.page.evaluate((maxItems) => {
        const results: any[] = [];
        
        const sectionElements = document.querySelectorAll('[data-test-id^="section-"]');
        sectionElements.forEach((section) => {
          const linkEl = section.querySelector('a') as HTMLAnchorElement;
          const link = linkEl?.href || '';
          
          const nameEl = section.querySelector('h2');
          const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';
          
          const textElements = section.querySelectorAll('span, div');
          let pinCount = '';
          for (const el of textElements) {
            const text = el.textContent?.trim() || '';
            const match = text.match(/^(\d+[\d\s,]*)\s*[kKmM]?\s*\S+$/);
            if (match && match[1]) {
              pinCount = match[1].replace(/\s/g, '');
              break;
            }
          }
          
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
        
        const pinElements = document.querySelectorAll('div[data-test-id="pin"]');
        pinElements.forEach((pinEl) => {
          const pinId = pinEl.getAttribute('data-test-pin-id') || '';
          const linkEl = pinEl.querySelector('a[href^="/pin/"]') as HTMLAnchorElement;
          const link = linkEl?.href || '';
          
          const img = pinEl.querySelector('img')?.src || pinEl.querySelector('video')?.poster || '';
          const imgAlt = pinEl.querySelector('img')?.alt || '';
          
          const isVideo = !!pinEl.querySelector('[data-test-id="pinrep-video"]');
          const videoDuration = pinEl.querySelector('[data-test-id="PinTypeIdentifier"]')?.textContent?.trim() || '';
          
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

      this.logger.info(`Found ${items.length} items`);
      return items;
    } catch (error) {
      this.logger.error('Error getting board content:', error);
      return [];
    }
  }

  /**
   * Get user's boards
   */
  async getUserBoards(username: string): Promise<Board[]> {
    this.logger.info(`Getting boards for user: ${username}`);

    try {
      this.logger.debug('Navigating to user boards page...');
      await this.page.goto(`https://www.pinterest.com/${username}/_saved/`, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Scrolling to load boards...');
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

      this.logger.info(`Found ${boards.length} boards`);
      return boards;
    } catch (error) {
      this.logger.error('Error getting boards:', error);
      return [];
    }
  }
}
