/**
 * Types and interfaces for Pinterest automation
 */

import { LogLevel } from './utils/logger';

export interface PinterestOptions {
  email?: string;
  password?: string;
  username?: string;
  headless?: boolean;
  userDataDir?: string;
  proxy?: ProxySettings;
  viewport?: ViewportSize;
  timeout?: number;
  slowMo?: number;
  useFingerprintSuite?: boolean;
  logLevel?: LogLevel;
}

export interface ProxySettings {
  server: string;
  username?: string;
  password?: string;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface PinData {
  imageUrl?: string;
  imageFile?: string;
  title: string;
  description?: string;
  link?: string;
  boardId?: string;
  boardName?: string;
  altText?: string;
}

export interface BoardData {
  name: string;
  description?: string;
  category?: string;
  privacy?: 'public' | 'private' | 'protected';
}

export interface SearchOptions {
  query: string;
  scope?: 'pins' | 'boards' | 'people';
  page?: number;
  limit?: number;
}

export interface UserProfile {
  type?: 'user';
  username: string;
  name?: string;
  fullName?: string;
  about?: string;
  location?: string;
  website?: string;
  profileImage?: string;
  avatarUrl?: string;
  followerCount?: number;
  followingCount?: number;
  pinCount?: number;
  boardCount?: number;
  url?: string;
  isFollowing?: boolean;
}

export interface SearchResult {
  pins?: Pin[];
  boards?: Board[];
  users?: UserProfile[];
}

export interface Pin {
  type?: 'pin';
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  link?: string;
  boardId?: string;
  creator?: string;
  saves?: number;
  comments?: number;
  isVideo?: boolean;
  videoDuration?: string;
  isSponsored?: boolean;
  advertiser?: string;
}

export interface BoardSection {
  type: 'section';
  id: string;
  name: string;
  url: string;
  pinCount?: string | number;
  coverImages?: string[];
}

export type BoardContent = Pin | BoardSection;

export interface Board {
  id: string;
  name: string;
  description?: string;
  url?: string;
  pinCount?: number | string;
  followerCount?: number;
  privacy?: string;
  coverImage?: string;
  creator?: string;
  lastUpdated?: string;
  coverImages?: string[];
}

export interface CommentData {
  pinId: string;
  text: string;
}

export interface MessageData {
  recipientUsername: string;
  message: string;
  pinId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

