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
   * Create a new pin
   */
  async createPin(pinData: PinData): Promise<boolean> {
    this.logger.info('Creating pin...');
    this.logger.debug('Pin data:', { title: pinData.title, boardName: pinData.boardName });

    let tempImagePath: string | null = null;

    try {
      this.logger.debug('Navigating to pin builder...');
      await this.page.goto('https://www.pinterest.com/pin-builder/', { waitUntil: 'domcontentloaded' });
      await this.stealth.randomDelay(1000, 2000);

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
        await this.page.waitForSelector(fileInput, { timeout: 10000 });
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

      if (pinData.boardName) {
        this.logger.debug('Selecting board:', pinData.boardName);
        const boardSelector = '[data-test-id="board-dropdown-select-button"]';
        await this.page.click(boardSelector);
        await this.stealth.randomDelay(500, 1000);
        
        const boardSearchInput = '#pickerSearchField';
        await this.page.waitForSelector(boardSearchInput, { timeout: 5000 });
        await this.page.fill(boardSearchInput, pinData.boardName);
        await this.stealth.randomDelay(1000, 1500);
        
        const boardRowSelector = `[data-test-id="board-row-${pinData.boardName}"] [data-test-id="board-row-save-button-container"] button`;
        await this.page.waitForSelector(boardRowSelector, { timeout: 5000 });
        await this.page.click(boardRowSelector);
        await this.stealth.randomDelay(2000, 3000);
      } else {
        this.logger.debug('Publishing to default board...');
        const publishButton = '[data-test-id="board-dropdown-save-button"]';
        await this.page.waitForSelector(publishButton, { timeout: 10000 });
        await this.page.click(publishButton);
        await this.stealth.randomDelay(2000, 3000);
      }

      // Clean up temporary file if it was created
      if (tempImagePath) {
        this.logger.debug('Cleaning up temporary image file...');
        await deleteFile(tempImagePath).catch(err => 
          this.logger.warn('Failed to delete temporary file:', err)
        );
      }

      this.logger.success('Pin created successfully');
      return true;
    } catch (error) {
      // Clean up temporary file on error
      if (tempImagePath) {
        this.logger.debug('Cleaning up temporary image file after error...');
        await deleteFile(tempImagePath).catch(err => 
          this.logger.warn('Failed to delete temporary file:', err)
        );
      }
      
      this.logger.error('Error creating pin:', error);
      return false;
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
      const optionsButton = 'button[data-test-id="pin-options-button"], button[aria-label*="More options" i]';
      await this.page.click(optionsButton);
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Clicking delete option...');
      await this.page.click('div[role="menuitem"]:has-text("Delete")');
      await this.stealth.randomDelay(500, 1000);

      this.logger.debug('Confirming deletion...');
      await this.page.click('button:has-text("Delete")');
      await this.stealth.randomDelay(2000, 3000);

      this.logger.success('Pin deleted successfully');
      return true;
    } catch (error) {
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
      const saveButton = 'button[data-test-id="pin-save-button"], button:has-text("Save")';
      await this.page.click(saveButton);
      await this.stealth.randomDelay(1000, 1500);

      if (boardName) {
        this.logger.debug('Selecting specific board...');
        const boardSelector = `div[data-test-id="board-row"]:has-text("${boardName}")`;
        await this.page.click(boardSelector).catch(() => {});
      } else {
        this.logger.debug('Selecting first available board...');
        await this.page.click('div[data-test-id="board-row"]').catch(() => {});
      }
      
      await this.stealth.randomDelay(2000, 3000);
      this.logger.success('Repin successful');
      return true;
    } catch (error) {
      this.logger.error('Error repinning:', error);
      return false;
    }
  }
}
