/**
 * AutoPin - Pinterest Automation Library
 * TypeScript + Playwright with Undetected Features
 */

export { PinterestClient } from './PinterestClient';
export { StealthManager } from './utils/stealth';
export { Logger, LogLevel, logger } from './utils/logger';
export * from './utils/helpers';
export * from './types';

// Re-export main types for convenience
export type {
  Pin,
  Board,
  BoardSection,
  BoardContent,
  UserProfile,
  PinterestOptions,
  SearchOptions,
} from './types';

