/**
 * Helper utilities for AutoPin
 */

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random number between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random delay between min and max milliseconds
 */
export async function randomDelay(min: number = 500, max: number = 2000): Promise<void> {
  const delay = randomInt(min, max);
  return sleep(delay);
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}

/**
 * Extract Pinterest username from URL
 */
export function extractUsernameFromUrl(url: string): string | null {
  try {
    const match = url.match(/pinterest\.com\/([^\/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extract Pinterest pin ID from URL
 */
export function extractPinIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/pin\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extract board name from URL
 */
export function extractBoardFromUrl(url: string): { username: string; board: string } | null {
  try {
    const match = url.match(/pinterest\.com\/([^\/]+)\/([^\/]+)/);
    if (match && match[1] && match[2]) {
      return {
        username: match[1],
        board: match[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate Pinterest URL
 */
export function isValidPinterestUrl(url: string): boolean {
  try {
    return url.includes('pinterest.com');
  } catch {
    return false;
  }
}

/**
 * Generate random user agent
 */
export function generateUserAgent(): string {
  const versions = ['120', '121', '122', '123', '124'];
  const version = versions[Math.floor(Math.random() * versions.length)];
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
}

/**
 * Format timestamp
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Parse Pinterest date format
 */
export function parsePinterestDate(dateStr: string): Date | null {
  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 30000,
  interval: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await sleep(interval);
  }
  
  return false;
}

/**
 * Rate limiter
 */
export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running: number = 0;
  private maxConcurrent: number;
  private minDelay: number;
  private lastExecution: number = 0;

  constructor(maxConcurrent: number = 1, minDelay: number = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastExecution = now - this.lastExecution;
          
          if (timeSinceLastExecution < this.minDelay) {
            await sleep(this.minDelay - timeSinceLastExecution);
          }
          
          this.lastExecution = Date.now();
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      });
      
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        this.running++;
        task();
      }
    }
  }
}

/**
 * Download an image from a URL to a temporary file
 * Returns the path to the downloaded file
 */
export async function downloadImage(url: string): Promise<string> {
  const https = await import('https');
  const http = await import('http');
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  return new Promise((resolve, reject) => {
    // Determine file extension from URL or default to .jpg
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath) || '.jpg';
    
    // Create temporary file path
    const tempDir = os.tmpdir();
    const fileName = `pinterest_${Date.now()}_${randomInt(1000, 9999)}${ext}`;
    const filePath = path.join(tempDir, fileName);

    // Choose http or https based on URL
    const client = url.startsWith('https') ? https : http;

    const file = fs.createWriteStream(filePath);
    
    const request = client.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(filePath);
          downloadImage(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filePath);
        reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    });

    request.on('error', (err) => {
      file.close();
      fs.unlink(filePath, () => {}); // Delete the file if it was created
      reject(err);
    });

    file.on('error', (err) => {
      file.close();
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

/**
 * Delete a file from the filesystem
 */
export async function deleteFile(filePath: string): Promise<void> {
  const fs = await import('fs');
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


