/**
 * Pinterest Automation Client with TypeScript and Playwright
 * Modular architecture with separate managers for different features
 */

import { Page } from 'playwright';
import {
  PinterestOptions,
  PinData,
  BoardData,
  SearchOptions,
  UserProfile,
  Pin,
  Board,
  BoardContent,
  LoginCredentials,
} from './types';
import { CoreManager } from './core';
import { AuthManager } from './auth';
import { PinsManager } from './pins';
import { BoardsManager } from './boards';
import { UsersManager } from './users';
import { SearchManager } from './search';

export class PinterestClient {
  private coreManager: CoreManager;
  private authManager: AuthManager | null = null;
  private pinsManager: PinsManager | null = null;
  private boardsManager: BoardsManager | null = null;
  private usersManager: UsersManager | null = null;
  private searchManager: SearchManager | null = null;
  private isLoggedIn: boolean = false;

  constructor(options: PinterestOptions = {}) {
    this.coreManager = new CoreManager(options);
  }

  /**
   * Initialize the browser and create context
   * Returns boolean indicating if user is already logged in
   */
  async init(): Promise<boolean> {
    const isLoggedIn = await this.coreManager.init();
    this.isLoggedIn = isLoggedIn;
    
    // Initialize all managers after core is ready
    const page = this.coreManager.getPage();
    const stealth = this.coreManager.getStealth();
    const logLevel = this.coreManager.getOptions().logLevel;
    
    if (page && stealth) {
      this.authManager = new AuthManager(page, stealth, logLevel);
      this.pinsManager = new PinsManager(page, stealth, logLevel);
      this.boardsManager = new BoardsManager(page, stealth, logLevel);
      this.usersManager = new UsersManager(page, stealth, logLevel);
      this.searchManager = new SearchManager(page, stealth, logLevel);
    }

    return isLoggedIn;
  }

  /**
   * Login to Pinterest
   */
  async login(email?: string, password?: string): Promise<boolean> {
    if (!this.authManager) throw new Error('Client not initialized. Call init() first.');

    const loginEmail = email || this.coreManager.getOptions().email;
    const loginPassword = password || this.coreManager.getOptions().password;

    if (!loginEmail || !loginPassword) {
      throw new Error('Email and password are required for login');
    }

    const success = await this.authManager.login(loginEmail, loginPassword);
    if (success) {
        this.isLoggedIn = true;
      this.coreManager.setLoggedIn(true);
      await this.coreManager.saveCookies();
    }
    return success;
  }

  /**
   * Create a new pin
   * Returns the URL of the created pin, or null if failed
   */
  async createPin(pinData: PinData): Promise<string | null> {
    if (!this.pinsManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.pinsManager.createPin(pinData);
  }

  /**
   * Create a new board
   */
  async createBoard(boardData: BoardData): Promise<boolean> {
    if (!this.boardsManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.boardsManager.createBoard(boardData);
  }

  /**
   * Repin (save) a pin to a board
   */
  async repin(pinUrl: string, boardName?: string): Promise<boolean> {
    if (!this.pinsManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.pinsManager.repin(pinUrl, boardName);
  }

  /**
   * Follow a user
   */
  async followUser(username: string): Promise<boolean> {
    if (!this.usersManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.usersManager.followUser(username);
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(username: string): Promise<boolean> {
    if (!this.usersManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.usersManager.unfollowUser(username);
  }

  /**
   * Follow a board
   */
  async followBoard(boardUrl: string): Promise<boolean> {
    if (!this.boardsManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.boardsManager.followBoard(boardUrl);
  }

  /**
   * Search for pins, boards, or users
   */
  async search(options: SearchOptions): Promise<(Pin | Board | UserProfile)[]> {
    if (!this.searchManager) throw new Error('Client not initialized');
    return this.searchManager.search(options);
  }

  /**
   * Get user profile information
   */
  async getUserProfile(username: string): Promise<UserProfile | null> {
    if (!this.usersManager) throw new Error('Client not initialized');
    return this.usersManager.getUserProfile(username);
  }

  /**
   * Like a pin
   */
  async likePin(pinUrl: string): Promise<boolean> {
    if (!this.pinsManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.pinsManager.likePin(pinUrl);
  }

  /**
   * Comment on a pin
   */
  async commentOnPin(pinUrl: string, comment: string): Promise<boolean> {
    if (!this.pinsManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.pinsManager.commentOnPin(pinUrl, comment);
  }

  /**
   * Delete a pin
   */
  async deletePin(pinUrl: string): Promise<boolean> {
    if (!this.pinsManager) throw new Error('Client not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');
    return this.pinsManager.deletePin(pinUrl);
  }

  /**
   * Get pins and sections from a board
   */
  async getBoardPins(boardUrl: string, limit: number = 50): Promise<BoardContent[]> {
    if (!this.boardsManager) throw new Error('Client not initialized');
    return this.boardsManager.getBoardPins(boardUrl, limit);
  }

  /**
   * Get user's boards
   */
  async getUserBoards(username: string): Promise<Board[]> {
    if (!this.boardsManager) throw new Error('Client not initialized');
    return this.boardsManager.getUserBoards(username);
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string): Promise<void> {
    return this.coreManager.screenshot(path);
  }

  /**
   * Get current page
   */
  getPage(): Page | null {
    return this.coreManager.getPage();
  }

  /**
   * Check if logged in
   */
  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  /**
   * Verify authentication by re-checking the authentication status
   * Useful to call before performing operations to ensure session is still valid
   */
  async verifyAuthentication(): Promise<boolean> {
    const isValid = await this.coreManager.verifyAuthentication();
    this.isLoggedIn = isValid;
    return isValid;
  }

  /**
   * Get current cookies from the browser session
   * Useful for saving session state externally
   */
  async getCookies(): Promise<any[]> {
    return this.coreManager.getCookies();
  }

  /**
   * Save current cookies (triggers onCookiesUpdate callback if provided)
   */
  async saveCookies(): Promise<void> {
    return this.coreManager.saveCookies();
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    return this.coreManager.close();
  }
}

