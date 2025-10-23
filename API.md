# AutoPin API Reference

Complete API documentation for AutoPin - Pinterest Automation Library.

## Table of Contents

- [PinterestClient](#pinterestclient)
- [Types & Interfaces](#types--interfaces)
- [Stealth Manager](#stealth-manager)
- [Utilities](#utilities)

---

## PinterestClient

Main class for Pinterest automation.

### Constructor

```typescript
new PinterestClient(options?: PinterestOptions)
```

#### Parameters

**options** (optional): `PinterestOptions`

```typescript
interface PinterestOptions {
  email?: string;              // Pinterest email
  password?: string;           // Pinterest password
  username?: string;           // Pinterest username
  headless?: boolean;          // Run in headless mode (default: false)
  userDataDir?: string;        // User data directory for persistent sessions
  proxy?: ProxySettings;       // Proxy configuration
  viewport?: ViewportSize;     // Browser viewport size
  timeout?: number;            // Default timeout in ms (default: 30000)
  slowMo?: number;            // Slow down actions in ms (default: 100)
  useFingerprintSuite?: boolean; // Use fingerprint suite (default: true)
}
```

#### Example

```typescript
const pinterest = new PinterestClient({
  headless: false,
  useFingerprintSuite: true,
  timeout: 30000,
});
```

### Methods

#### init()

Initialize the browser and create context.

```typescript
await pinterest.init(): Promise<void>
```

**Example:**
```typescript
await pinterest.init();
```

---

#### login()

Login to Pinterest.

```typescript
await pinterest.login(email?: string, password?: string): Promise<boolean>
```

**Parameters:**
- `email` (optional): Pinterest email
- `password` (optional): Pinterest password

**Returns:** `Promise<boolean>` - true if login successful

**Example:**
```typescript
const success = await pinterest.login('user@example.com', 'password');
if (success) {
  console.log('Logged in!');
}
```

---

#### createPin()

Create a new pin.

```typescript
await pinterest.createPin(pinData: PinData): Promise<boolean>
```

**Parameters:**
- `pinData`: Pin data object

```typescript
interface PinData {
  imageUrl?: string;      // URL of image to pin
  imageFile?: string;     // Local file path to image
  title: string;          // Pin title (required)
  description?: string;   // Pin description
  link?: string;          // Destination link
  boardId?: string;       // Board ID
  boardName?: string;     // Board name
  altText?: string;       // Alt text for accessibility
}
```

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.createPin({
  imageFile: 'path/to/image.jpg',
  title: 'My Amazing Pin',
  description: 'Check this out!',
  boardName: 'My Board',
});
```

---

#### createBoard()

Create a new board.

```typescript
await pinterest.createBoard(boardData: BoardData): Promise<boolean>
```

**Parameters:**

```typescript
interface BoardData {
  name: string;                          // Board name (required)
  description?: string;                  // Board description
  category?: string;                     // Board category
  privacy?: 'public' | 'private' | 'protected'; // Board privacy
}
```

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.createBoard({
  name: 'My New Board',
  description: 'Collection of awesome pins',
  privacy: 'public',
});
```

---

#### repin()

Repin (save) a pin to a board.

```typescript
await pinterest.repin(pinUrl: string, boardName?: string): Promise<boolean>
```

**Parameters:**
- `pinUrl`: URL of the pin to repin
- `boardName` (optional): Name of board to save to

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.repin(
  'https://www.pinterest.com/pin/123456789/',
  'My Collection'
);
```

---

#### likePin()

Like a pin.

```typescript
await pinterest.likePin(pinUrl: string): Promise<boolean>
```

**Parameters:**
- `pinUrl`: URL of the pin to like

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.likePin('https://www.pinterest.com/pin/123456789/');
```

---

#### commentOnPin()

Comment on a pin.

```typescript
await pinterest.commentOnPin(pinUrl: string, comment: string): Promise<boolean>
```

**Parameters:**
- `pinUrl`: URL of the pin
- `comment`: Comment text

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.commentOnPin(
  'https://www.pinterest.com/pin/123456789/',
  'Great pin! 😍'
);
```

---

#### deletePin()

Delete a pin.

```typescript
await pinterest.deletePin(pinUrl: string): Promise<boolean>
```

**Parameters:**
- `pinUrl`: URL of the pin to delete

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.deletePin('https://www.pinterest.com/pin/123456789/');
```

---

#### followUser()

Follow a user.

```typescript
await pinterest.followUser(username: string): Promise<boolean>
```

**Parameters:**
- `username`: Username to follow

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.followUser('someuser');
```

---

#### unfollowUser()

Unfollow a user.

```typescript
await pinterest.unfollowUser(username: string): Promise<boolean>
```

**Parameters:**
- `username`: Username to unfollow

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.unfollowUser('someuser');
```

---

#### followBoard()

Follow a board.

```typescript
await pinterest.followBoard(boardUrl: string): Promise<boolean>
```

**Parameters:**
- `boardUrl`: URL of the board to follow

**Returns:** `Promise<boolean>` - true if successful

**Example:**
```typescript
await pinterest.followBoard('https://www.pinterest.com/user/board/');
```

---

#### search()

Search for pins, boards, or users.

```typescript
await pinterest.search(options: SearchOptions): Promise<any[]>
```

**Parameters:**

```typescript
interface SearchOptions {
  query: string;                        // Search query (required)
  scope?: 'pins' | 'boards' | 'people'; // Search scope (default: 'pins')
  page?: number;                        // Page number
  limit?: number;                       // Results limit
}
```

**Returns:** `Promise<any[]>` - Array of search results

**Example:**
```typescript
const pins = await pinterest.search({
  query: 'web development',
  scope: 'pins',
  limit: 20,
});
```

---

#### getUserProfile()

Get user profile information.

```typescript
await pinterest.getUserProfile(username: string): Promise<UserProfile | null>
```

**Parameters:**
- `username`: Username to get profile for

**Returns:** `Promise<UserProfile | null>` - User profile data or null

```typescript
interface UserProfile {
  username: string;
  fullName?: string;
  about?: string;
  location?: string;
  website?: string;
  profileImage?: string;
  followerCount?: number;
  followingCount?: number;
  pinCount?: number;
  boardCount?: number;
}
```

**Example:**
```typescript
const profile = await pinterest.getUserProfile('pinterest');
console.log(profile.username, profile.followerCount);
```

---

#### getBoardPins()

Get pins from a board.

```typescript
await pinterest.getBoardPins(boardUrl: string, limit?: number): Promise<Pin[]>
```

**Parameters:**
- `boardUrl`: URL of the board
- `limit` (optional): Maximum number of pins to fetch (default: 20)

**Returns:** `Promise<Pin[]>` - Array of pins

```typescript
interface Pin {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
  boardId?: string;
  creator?: string;
  saves?: number;
  comments?: number;
}
```

**Example:**
```typescript
const pins = await pinterest.getBoardPins(
  'https://www.pinterest.com/user/board/',
  50
);
```

---

#### getUserBoards()

Get user's boards.

```typescript
await pinterest.getUserBoards(username: string): Promise<Board[]>
```

**Parameters:**
- `username`: Username to get boards for

**Returns:** `Promise<Board[]>` - Array of boards

```typescript
interface Board {
  id: string;
  name: string;
  description?: string;
  url?: string;
  pinCount?: number;
  followerCount?: number;
  privacy?: string;
  coverImage?: string;
}
```

**Example:**
```typescript
const boards = await pinterest.getUserBoards('myusername');
boards.forEach(board => console.log(board.name));
```

---

#### screenshot()

Take a screenshot of the current page.

```typescript
await pinterest.screenshot(path: string): Promise<void>
```

**Parameters:**
- `path`: File path to save screenshot

**Example:**
```typescript
await pinterest.screenshot('screenshot.png');
```

---

#### getPage()

Get the Playwright page instance for custom operations.

```typescript
pinterest.getPage(): Page | null
```

**Returns:** `Page | null` - Playwright page instance

**Example:**
```typescript
const page = pinterest.getPage();
if (page) {
  await page.goto('https://www.pinterest.com/');
  const title = await page.title();
}
```

---

#### isAuthenticated()

Check if logged in.

```typescript
pinterest.isAuthenticated(): boolean
```

**Returns:** `boolean` - true if logged in

**Example:**
```typescript
if (pinterest.isAuthenticated()) {
  console.log('User is logged in');
}
```

---

#### close()

Close browser and cleanup.

```typescript
await pinterest.close(): Promise<void>
```

**Example:**
```typescript
await pinterest.close();
```

---

## Stealth Manager

Handles stealth features and anti-detection.

### Methods

#### createStealthContext()

Create a stealth browser context with realistic fingerprints.

```typescript
await stealth.createStealthContext(browser: Browser): Promise<BrowserContext>
```

---

#### applyStealthToPage()

Apply stealth techniques to a page.

```typescript
await stealth.applyStealthToPage(page: Page): Promise<void>
```

---

#### randomDelay()

Generate random human-like delay.

```typescript
await stealth.randomDelay(min?: number, max?: number): Promise<void>
```

**Parameters:**
- `min`: Minimum delay in ms (default: 500)
- `max`: Maximum delay in ms (default: 2000)

---

#### humanMouseMove()

Simulate human-like mouse movement.

```typescript
await stealth.humanMouseMove(page: Page, selector: string): Promise<void>
```

---

#### humanType()

Simulate human-like typing.

```typescript
await stealth.humanType(page: Page, selector: string, text: string): Promise<void>
```

---

#### humanScroll()

Scroll page naturally.

```typescript
await stealth.humanScroll(page: Page, distance?: number): Promise<void>
```

---

## Utilities

Helper functions from `utils/helpers.ts`.

### sleep()

```typescript
await sleep(ms: number): Promise<void>
```

Sleep for specified milliseconds.

---

### randomInt()

```typescript
randomInt(min: number, max: number): number
```

Random integer between min and max (inclusive).

---

### retry()

```typescript
await retry<T>(
  fn: () => Promise<T>,
  maxRetries?: number,
  initialDelay?: number
): Promise<T>
```

Retry a function with exponential backoff.

---

### extractPinIdFromUrl()

```typescript
extractPinIdFromUrl(url: string): string | null
```

Extract Pinterest pin ID from URL.

---

### RateLimiter

Rate limiter class for controlling request frequency.

```typescript
const limiter = new RateLimiter(maxConcurrent, minDelay);
await limiter.execute(() => someAsyncFunction());
```

---

## Types & Interfaces

### PinterestOptions

```typescript
interface PinterestOptions {
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
}
```

### ProxySettings

```typescript
interface ProxySettings {
  server: string;
  username?: string;
  password?: string;
}
```

### ViewportSize

```typescript
interface ViewportSize {
  width: number;
  height: number;
}
```

---

For complete examples and use cases, see [example.ts](src/example.ts).

For setup instructions, see [SETUP.md](SETUP.md).


