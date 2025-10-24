import { Page } from 'playwright';
import { SearchOptions, Pin, Board, UserProfile } from './types';
import { Logger, LogLevel } from './utils/logger';
import { StealthManager } from './utils/stealth';

export class SearchManager {
  private page: Page;
  private stealth: StealthManager;
  private logger: Logger;

  constructor(page: Page, stealth: StealthManager, logLevel: LogLevel = LogLevel.INFO) {
    this.page = page;
    this.stealth = stealth;
    this.logger = new Logger('SearchManager', logLevel);
  }

  /**
   * Search for pins, boards, or users
   */
  async search(options: SearchOptions): Promise<(Pin | Board | UserProfile)[]> {
    this.logger.info(`Searching for: ${options.query}`);
    this.logger.debug('Scope:', options.scope || 'pins', 'Limit:', options.limit);

    try {
      const scope = options.scope || 'pins';
      const query = encodeURIComponent(options.query);
      
      let searchUrl: string;
      if (scope === 'people') {
        searchUrl = `https://www.pinterest.com/search/users/?q=${query}`;
        if (options.limit) {
          searchUrl += `&len=${options.limit}`;
        }
      } else {
        searchUrl = `https://www.pinterest.com/search/${scope}/?q=${query}`;
      }
      
      this.logger.debug('Navigating to search results...');
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(2000, 3000);

      this.logger.debug('Scrolling to load more results...');
      await this.stealth.humanScroll(this.page, 1000);
      await this.stealth.randomDelay(1000, 2000);

      const results = await this.page.evaluate((searchScope) => {
        const items: any[] = [];
        
        if (searchScope === 'pins') {
          const pins = document.querySelectorAll('div[data-test-id="pin"]');
          pins.forEach((pin) => {
            const pinId = pin.getAttribute('data-test-pin-id') || '';
            const isSponsored = !!pin.querySelector('[data-test-id="otpp"], [data-test-id="one-tap-desktop"]');
            
            let linkEl = pin.querySelector('a[href^="/pin/"]') as HTMLAnchorElement;
            if (!linkEl) {
              linkEl = pin.querySelector('[data-test-id="otpp"] a, [data-test-id="one-tap-desktop"] a') as HTMLAnchorElement;
            }
            
            const link = linkEl?.href || '';
            let title = '';
            
            const titleEl = pin.querySelector('[data-test-id="pinrep-footer-organic-title"] a');
            if (titleEl?.textContent) {
              title = titleEl.textContent.trim().replace(/^"|"$/g, '');
            }
            
            if (!title && isSponsored) {
              const footerTexts = pin.querySelectorAll('[data-test-id="pinrep-footer"] .CWH, [data-test-id="pinrep-footer"] .gxb');
              for (const el of footerTexts) {
                const text = el.textContent?.trim() || '';
                if (text.length > 20 && !text.match(/^[\w.-]+\.(com|fr|net|org|io)/)) {
                  title = text;
                  break;
                }
              }
              
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
            
            if (!title && linkEl) {
              const ariaLabel = linkEl.getAttribute('aria-label') || '';
              const afterColon = ariaLabel.split(':').slice(1).join(':').trim();
              const afterQuote = ariaLabel.match(/"([^"]+)"/);
              
              if (afterQuote && afterQuote[1]) {
                title = afterQuote[1];
              } else if (afterColon && afterColon.length > 5 && !afterColon.match(/^[\w.-]+\.(com|fr|net|org|io)/)) {
                title = afterColon;
              }
            }
            
            const img = pin.querySelector('img')?.src || pin.querySelector('video')?.poster || '';
            const imgAlt = pin.querySelector('img')?.alt || '';
            const isVideo = !!pin.querySelector('[data-test-id="pinrep-video"]');
            const videoDuration = pin.querySelector('[data-test-id="PinTypeIdentifier"]')?.textContent?.trim() || '';
            
            let advertiser = '';
            if (isSponsored) {
              const footerLinks = pin.querySelectorAll('[data-test-id="pinrep-footer"] a');
              for (const link of footerLinks) {
                const text = link.textContent?.trim() || '';
                if (text.length > 2 && text.length < 50 && !text.match(/^[\w.-]+\.(com|fr|net|org|io)/)) {
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
            const linkEl = board.querySelector('a') as HTMLAnchorElement;
            const link = linkEl?.href || '';
            const nameEl = board.querySelector('h2');
            const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';
            const creatorEl = board.querySelector('[data-test-id="line-clamp-wrapper"]');
            const creator = creatorEl?.textContent?.trim() || '';
            
            const pinCountEl = board.querySelector('[data-test-id="pinAndSectionCount-pin-count"]');
            const pinCountText = pinCountEl?.textContent?.trim() || '';
            const pinCountMatch = pinCountText.match(/(\d+[\d\s,]*)/);
            const pinCount = pinCountMatch ? pinCountMatch[1].replace(/\s/g, '') : '';
            
            const timeEl = board.querySelector('[data-test-id="pinAndSectionCount-time"]');
            const lastUpdated = timeEl?.textContent?.trim() || '';
            
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
              coverImages: images.slice(0, 3)
            });
          });
        } else if (searchScope === 'people') {
          const users = document.querySelectorAll('div[data-test-id="user-rep-with-card"], div[data-test-id="user-rep"]');
          users.forEach((user) => {
            const linkEl = user.querySelector('a') as HTMLAnchorElement;
            const link = linkEl?.href || '';
            const username = link.split('/').filter(Boolean).pop() || '';
            
            const nameEl = user.querySelector('[data-test-id="user-rep-name"]');
            const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';
            
            const followersEl = user.querySelector('[data-test-id="user-rep-followers"]');
            const followersText = followersEl?.textContent?.trim() || '';
            
            let followerCount = 0;
            const followerMatch = followersText.match(/([\d.,]+)\s*([kKmM]?)/);
            if (followerMatch) {
              let num = parseFloat(followerMatch[1].replace(',', '.').replace(/\s/g, ''));
              const suffix = followerMatch[2].toLowerCase();
              if (suffix === 'k') num *= 1000;
              else if (suffix === 'm') num *= 1000000;
              followerCount = Math.floor(num);
            }
            
            const avatarImg = user.querySelector('img')?.src || '';
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

      this.logger.info(`Found ${results.length} results`);
      return results;
    } catch (error) {
      this.logger.error('Error searching:', error);
      return [];
    }
  }
}
