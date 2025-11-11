import { Page } from 'playwright';
import { PinData } from './types';
import { Logger, LogLevel } from './utils/logger';
import { StealthManager } from './utils/stealth';
import { downloadImage, deleteFile } from './utils/helpers';

export class PinsManager {
  private page: Page;
  private stealth: StealthManager;
  private logger: Logger;

  constructor(page: Page, stealth: StealthManager, logLevel: LogLevel = LogLevel.INFO) {
    this.page = page;
    this.stealth = stealth;
    this.logger = new Logger('PinsManager', logLevel);
  }

  /**
   * Take a screenshot on error for debugging
   */
  private async takeErrorScreenshot(operationName: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `error-${operationName}-${timestamp}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      this.logger.error(`Screenshot saved to: ${screenshotPath}`);
    } catch (screenshotError) {
      this.logger.warn('Failed to take error screenshot:', screenshotError);
    }
  }

  /**
   * Create a new pin
   * Returns the URL of the created pin
   */
  async createPin(pinData: PinData): Promise<string | null> {
    this.logger.info('Creating pin...');
    this.logger.debug('Pin data:', { title: pinData.title, boardName: pinData.boardName });

    let tempImagePath: string | null = null;

    try {
      this.logger.debug('Navigating to pin builder...');
      await this.page.goto('https://www.pinterest.com/pin-builder/', { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      // Check if we were redirected to login page (authentication failed)
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        this.logger.error('Redirected to login page - authentication has expired or is invalid');
        throw new Error('Authentication failed: User was redirected to login page. Please re-login or check your cookies.');
      }

      // Verify we're on the pin builder page
      if (!currentUrl.includes('/pin-builder') && !currentUrl.includes('/pin-creation-tool')) {
        this.logger.warn(`Unexpected URL after navigation: ${currentUrl}`);
        throw new Error(`Failed to navigate to pin builder. Current URL: ${currentUrl}`);
      }

      this.logger.debug('Successfully navigated to pin builder');

      // Handle image upload - either from URL or file
      let imagePathToUpload: string | undefined;

      if (pinData.imageUrl) {
        this.logger.info('Downloading image from URL:', pinData.imageUrl);
        try {
          tempImagePath = await downloadImage(pinData.imageUrl);
          imagePathToUpload = tempImagePath;
          this.logger.debug('Image downloaded to:', tempImagePath);
        } catch (error) {
          this.logger.error('Failed to download image from URL:', error);
          throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (pinData.imageFile) {
        imagePathToUpload = pinData.imageFile;
      }

      if (imagePathToUpload) {
        this.logger.debug('Uploading image...');
        const fileInput = 'input[type="file"][data-test-id^="media-upload-input"]';
        
        try {
          await this.page.waitForSelector(fileInput, { timeout: 10000 });
        } catch (error) {
          // Double-check if we got redirected to login
          const urlAfterWait = this.page.url();
          if (urlAfterWait.includes('/login')) {
            this.logger.error('User was redirected to login while waiting for file input');
            throw new Error('Authentication failed during pin creation. Your session may have expired. Please re-login.');
          }
          
          this.logger.error('File input selector not found on page');
          this.logger.debug('Current page URL:', urlAfterWait);
          throw new Error(`Could not find file upload input on pin builder page. This usually indicates authentication issues or Pinterest UI changes. Current URL: ${urlAfterWait}`);
        }
        
        await this.page.setInputFiles(fileInput, imagePathToUpload);
        await this.stealth.randomDelay(2000, 3000);
      }

      if (pinData.title) {
        this.logger.debug('Filling pin title...');
        const titleInput = 'textarea[id^="pin-draft-title"]';
        await this.page.waitForSelector(titleInput, { timeout: 10000 });
        await this.page.click(titleInput);
        await this.stealth.randomDelay(200, 400);
        await this.page.fill(titleInput, pinData.title);
        await this.stealth.randomDelay(500, 1000);
      }

      if (pinData.description) {
        this.logger.debug('Filling pin description...');
        await this.page.keyboard.press('Tab');
        await this.stealth.randomDelay(300, 500);
        await this.page.keyboard.type(pinData.description, { delay: 50 });
        await this.stealth.randomDelay(500, 1000);
      }

      if (pinData.link) {
        this.logger.debug('Filling pin link...');
        const linkInput = 'textarea[id^="pin-draft-link"]';
        await this.page.waitForSelector(linkInput, { timeout: 5000 });
        await this.page.click(linkInput);
        await this.stealth.randomDelay(200, 400);
        await this.page.fill(linkInput, pinData.link);
        await this.stealth.randomDelay(500, 1000);
      }

      let boardSelectionSuccess = false;
      
      if (pinData.boardName) {
        this.logger.debug('Selecting board:', pinData.boardName);
        try {
          const boardSelector = '[data-test-id="board-dropdown-select-button"]';
          // Wait for the button to be enabled (aria-disabled="false")
          await this.page.waitForSelector(`${boardSelector}[aria-disabled="false"]`, { timeout: 10000 });
          await this.page.click(boardSelector);
          await this.stealth.randomDelay(500, 1000);
          
          // Wait for the board picker popover to appear
          await this.page.waitForSelector('[data-test-id="board-picker-flyout"]', { timeout: 5000 });
          await this.stealth.randomDelay(300, 500);
          
          const boardSearchInput = '#pickerSearchField';
          await this.page.waitForSelector(boardSearchInput, { timeout: 5000 });
          await this.page.fill(boardSearchInput, pinData.boardName);
          await this.stealth.randomDelay(1000, 1500);
          
          const boardRowSelector = `[data-test-id="board-row-${pinData.boardName}"] [data-test-id="board-row-save-button-container"] button`;
          await this.page.waitForSelector(boardRowSelector, { timeout: 5000 });
          await this.page.click(boardRowSelector);
          await this.stealth.randomDelay(2000, 3000);
          this.logger.success('Board selected successfully:', pinData.boardName);
          boardSelectionSuccess = true;
        } catch (boardError) {
          // If board selection fails/times out, fall back to publishing to default board
          this.logger.warn('Board selection timed out or failed, falling back to default board:', boardError);
        }
      }
      
      // Publish to default board if no board name was provided or if board selection failed
      if (!boardSelectionSuccess) {
        this.logger.debug('Publishing to default board...');
        const publishButton = '[data-test-id="board-dropdown-save-button"]';
        await this.page.waitForSelector(publishButton, { timeout: 10000 });
        await this.page.click(publishButton);
        await this.stealth.randomDelay(2000, 3000);
      }

      // Wait for success popup and extract pin URL
      this.logger.debug('Waiting for success popup...');
      try {
        // Wait for the success popup with "Voir votre Épingle" (See your Pin) button
        const pinLinkSelector = 'a[data-test-id="seeItNow"], a[href*="/pin/"]';
        await this.page.waitForSelector(pinLinkSelector, { timeout: 15000 });
        await this.stealth.randomDelay(1000, 2000);
        
        // Extract the pin URL from the link
        const pinHref = await this.page.getAttribute(pinLinkSelector, 'href');
        if (pinHref) {
          // Convert relative URL to absolute URL
          const baseUrl = 'https://www.pinterest.com';
          const pinUrl = pinHref.startsWith('http') ? pinHref : `${baseUrl}${pinHref}`;
          this.logger.success('Pin created successfully:', pinUrl);
          
          // Clean up temporary file if it was created
          if (tempImagePath) {
            this.logger.debug('Cleaning up temporary image file...');
            await deleteFile(tempImagePath).catch(err => 
              this.logger.warn('Failed to delete temporary file:', err)
            );
          }
          
          // Optional: Close the popup by pressing Escape or clicking outside
          await this.page.keyboard.press('Escape').catch(() => {});
          await this.stealth.randomDelay(500, 1000);
          
          return pinUrl;
        } else {
          this.logger.warn('Could not extract pin URL from popup');
          
          // Clean up temporary file if it was created
          if (tempImagePath) {
            this.logger.debug('Cleaning up temporary image file...');
            await deleteFile(tempImagePath).catch(err => 
              this.logger.warn('Failed to delete temporary file:', err)
            );
          }
          
          return null;
        }
      } catch (error) {
        this.logger.warn('Could not find success popup, pin may still have been created');
        
        // Clean up temporary file if it was created
        if (tempImagePath) {
          this.logger.debug('Cleaning up temporary image file...');
          await deleteFile(tempImagePath).catch(err => 
            this.logger.warn('Failed to delete temporary file:', err)
          );
        }
        
        return null;
      }
    } catch (error) {
      // Take screenshot on error for debugging
      await this.takeErrorScreenshot('createPin');
      
      // Clean up temporary file on error
      if (tempImagePath) {
        this.logger.debug('Cleaning up temporary image file after error...');
        await deleteFile(tempImagePath).catch(err => 
          this.logger.warn('Failed to delete temporary file:', err)
        );
      }
      
      this.logger.error('Error creating pin:', error);
      return null;
    }
  }

  /**
   * Like a pin
   */
  async likePin(pinUrl: string): Promise<boolean> {
    this.logger.info('Liking pin...');

    try {
      await this.page.goto(pinUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Clicking like button...');
      const likeButton = 'button[data-test-id="react-button"]';
      await this.page.click(likeButton);
      await this.stealth.randomDelay(1000, 1500);

      this.logger.success('Pin liked successfully');
      return true;
    } catch (error) {
      await this.takeErrorScreenshot('likePin');
      this.logger.error('Error liking pin:', error);
      return false;
    }
  }

  /**
   * Comment on a pin
   */
  async commentOnPin(pinUrl: string, comment: string): Promise<boolean> {
    this.logger.info('Commenting on pin...');
    this.logger.debug('Comment length:', comment.length);

    try {
      await this.page.goto(pinUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Waiting for comment editor...');
      const editorContainer = '[data-test-id="editor-with-mentions"], [data-test-id="comment-editor-container"]';
      await this.page.waitForSelector(editorContainer, { timeout: 10000 });
      
      const editableDiv = '.public-DraftEditor-content[contenteditable="true"]';
      await this.page.click(editableDiv);
      await this.stealth.randomDelay(300, 600);
      
      this.logger.debug('Typing comment...');
      await this.page.keyboard.type(comment, { delay: 100 });
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Submitting comment...');
      const submitButton = '[data-test-id="activity-item-create-submit"] button';
      try {
        await this.page.waitForSelector(submitButton, { timeout: 5000 });
        await this.page.click(submitButton);
      } catch {
        await this.page.keyboard.press('Enter');
      }
      
      await this.stealth.randomDelay(2000, 3000);
      this.logger.success('Comment posted successfully');
      return true;
    } catch (error) {
      await this.takeErrorScreenshot('commentOnPin');
      this.logger.error('Error commenting:', error);
      return false;
    }
  }

  /**
   * Delete a pin
   */
  async deletePin(pinUrl: string): Promise<boolean> {
    this.logger.info('Deleting pin...');

    try {
      await this.page.goto(pinUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Clicking options menu...');
      const optionsButton = 'button[data-test-id="pin-options-button"]';
      await this.page.click(optionsButton);
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Clicking delete option...');
      // Use data-test-id instead of text to avoid language issues
      await this.page.click('[data-test-id="delete-pin-menu-item"]');
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Confirming deletion...');
      // Use data-test-id or role-based selector instead of text
      await this.page.click('[data-test-id="confirmation-delete-button"], [role="dialog"] button[type="submit"]');
      await this.stealth.randomDelay(2000, 3000);

      this.logger.success('Pin deleted successfully');
      return true;
    } catch (error) {
      await this.takeErrorScreenshot('deletePin');
      this.logger.error('Error deleting pin:', error);
      return false;
    }
  }

  /**
   * Repin (save) a pin to a board
   */
  async repin(pinUrl: string, boardName?: string): Promise<boolean> {
    this.logger.info('Repinning...');
    this.logger.debug('Board name:', boardName || 'default');

    try {
      await this.page.goto(pinUrl, { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

      this.logger.debug('Clicking save button...');
      const saveButton = 'button[data-test-id="pin-save-button"]';
      await this.page.click(saveButton);
      await this.stealth.randomDelay(1000, 1500);

      if (boardName) {
        this.logger.debug('Selecting specific board...');
        // Use data-test-id attribute instead of text content
        const boardSelector = `[data-test-id="board-row-${boardName}"] [data-test-id="board-row-save-button-container"] button`;
        await this.page.click(boardSelector).catch(() => {});
      } else {
        this.logger.debug('Selecting first available board...');
        await this.page.click('[data-test-id^="board-row-"] [data-test-id="board-row-save-button-container"] button').catch(() => {});
      }
      
      await this.stealth.randomDelay(2000, 3000);
      this.logger.success('Repin successful');
      return true;
    } catch (error) {
      await this.takeErrorScreenshot('repin');
      this.logger.error('Error repinning:', error);
      return false;
    }
  }
}
