# pinterest-js-client - Pinterest Automation Library

[![npm version](https://img.shields.io/npm/v/pinterest-js-client.svg)](https://www.npmjs.com/package/pinterest-js-client)
[![npm downloads](https://img.shields.io/npm/dm/pinterest-js-client.svg)](https://www.npmjs.com/package/pinterest-js-client)
[![license](https://img.shields.io/npm/l/pinterest-js-client.svg)](https://github.com/Tartofraise/pinterest-js-client/blob/master/LICENSE)
[![Node.js Version](https://img.shields.io/node/v/pinterest-js-client.svg)](https://nodejs.org)
[![GitHub stars](https://img.shields.io/github/stars/Tartofraise/pinterest-js-client.svg?style=social)](https://github.com/Tartofraise/pinterest-js-client)

An **unofficial** JavaScript client for Pinterest automation. A powerful TypeScript library for Pinterest automation using Playwright with built-in **undetected features** and **fingerprint-suite** integration. This is a complete rewrite of py3-pinterest with enhanced stealth capabilities.

## ✨ Features

- 🔐 **Secure Authentication** - Login with email/password, cookie persistence
- 🍪 **Flexible Cookie Management** - File-based, in-memory, or custom external storage (perfect for multi-account)
- 📌 **Pin Management** - Create, repin, like, comment, and delete pins
- 📋 **Board Operations** - Create boards, get board pins, follow boards
- 👥 **User Interactions** - Follow/unfollow users, get user profiles
- 🔍 **Search & Discovery** - Search pins, boards, and users
- 🥷 **Stealth Features** - Undetected browsing with fingerprint randomization
- 🤖 **Human-like Behavior** - Random delays, natural mouse movements, human typing
- 🛡️ **Anti-Detection** - WebDriver masking, canvas fingerprinting, WebGL spoofing
- 🎭 **Fingerprint Injector** - Realistic browser fingerprints using [fingerprint-injector](https://www.npmjs.com/package/fingerprint-injector)
- 📸 **Screenshot Support** - Capture page screenshots
- 🔄 **Session Management** - Persistent sessions with automatic or manual cookie handling
- ⚙️ **Highly Configurable** - Proxy support, custom viewport, timeouts, and more

## 📦 Installation

Install the package via npm:

```bash
npm install pinterest-js-client
```

**Important:** After installation, you need to install Playwright's Chromium browser:

```bash
npx playwright install chromium
```

Or if you cloned this repository for development:

```bash
npm install
npm run setup-playwright
```

## 🚀 Quick Start

```typescript
import { PinterestClient } from 'pinterest-js-client';

const pinterest = new PinterestClient({
  headless: false,
  useFingerprintSuite: true,
});

await pinterest.init();
await pinterest.login('your-email@example.com', 'your-password');

// Create a pin
await pinterest.createPin({
  imageFile: 'path/to/image.jpg',
  title: 'My Pin',
  description: 'Check out this amazing pin!',
  boardName: 'My Board',
});

await pinterest.close();
```

## 📖 Documentation

### Initialization

```typescript
const pinterest = new PinterestClient({
  email: 'your-email@example.com',      // Optional: Email for login
  password: 'your-password',             // Optional: Password for login
  headless: false,                       // Run in headless mode (default: false)
  slowMo: 100,                          // Slow down by ms (default: 100)
  timeout: 30000,                       // Default timeout in ms (default: 30000)
  useFingerprintSuite: true,            // Use fingerprint suite (default: true)
  viewport: { width: 1920, height: 1080 }, // Viewport size
  userDataDir: './user-data',           // User data directory for persistent sessions
  proxy: {                               // Proxy settings (optional)
    server: 'http://proxy.example.com:8080',
    username: 'user',
    password: 'pass',
  },
});

await pinterest.init();
```

### Authentication

```typescript
// Login
const success = await pinterest.login('email@example.com', 'password');

// Check if logged in
const isAuth = pinterest.isAuthenticated();
```

### Pin Operations

```typescript
// Create a pin
await pinterest.createPin({
  imageFile: 'path/to/image.jpg',
  title: 'My Amazing Pin',
  description: 'This is a great pin!',
  link: 'https://example.com',
  boardName: 'My Board',
  altText: 'Image description',
});

// Repin (save) a pin
await pinterest.repin('https://www.pinterest.com/pin/123456789/', 'Board Name');

// Like a pin
await pinterest.likePin('https://www.pinterest.com/pin/123456789/');

// Comment on a pin
await pinterest.commentOnPin('https://www.pinterest.com/pin/123456789/', 'Great pin! 😍');

// Delete a pin
await pinterest.deletePin('https://www.pinterest.com/pin/123456789/');

// Get pins from a board
const pins = await pinterest.getBoardPins('https://www.pinterest.com/user/board/', 20);
```

### Board Operations

```typescript
// Create a board
await pinterest.createBoard({
  name: 'My New Board',
  description: 'A collection of awesome pins',
  privacy: 'public', // 'public' | 'private' | 'protected'
});

// Get user's boards
const boards = await pinterest.getUserBoards('username');

// Follow a board
await pinterest.followBoard('https://www.pinterest.com/user/board/');
```

### User Operations

```typescript
// Follow a user
await pinterest.followUser('username');

// Unfollow a user
await pinterest.unfollowUser('username');

// Get user profile
const profile = await pinterest.getUserProfile('username');
console.log(profile);
// Output: { username, fullName, about, followerCount, followingCount, ... }
```

### Search & Discovery

```typescript
// Search for pins
const pins = await pinterest.search({
  query: 'web development',
  scope: 'pins',
  limit: 20,
});

// Search for boards
const boards = await pinterest.search({
  query: 'programming',
  scope: 'boards',
});

// Search for users
const users = await pinterest.search({
  query: 'designers',
  scope: 'people',
});
```

### Utility Functions

```typescript
// Take a screenshot
await pinterest.screenshot('screenshot.png');

// Get the Playwright page for custom operations
const page = pinterest.getPage();
await page.goto('https://www.pinterest.com/');

// Close the browser
await pinterest.close();
```

## 🥷 Stealth Features

This library includes advanced anti-detection features:

### 1. **Fingerprint Injector Integration**
- Uses `fingerprint-injector` to generate and inject realistic browser fingerprints
- Randomizes canvas, WebGL, and audio fingerprints
- Mimics real device characteristics
- Supports multiple browsers, devices, and operating systems

### 2. **WebDriver Detection Prevention**
- Removes `navigator.webdriver` property
- Overrides automation-related properties
- Injects realistic browser plugins

### 3. **Human-like Behavior**
- Random delays between actions (500-2000ms)
- Natural mouse movements with curves
- Human-like typing with variable speed
- Smooth scrolling with realistic patterns

### 4. **Browser Property Spoofing**
- Realistic user agents
- Proper language and timezone settings
- Natural viewport sizes
- Chrome properties injection

### 5. **Canvas & WebGL Fingerprinting**
- Adds minimal noise to canvas data
- Spoofs WebGL vendor and renderer
- Prevents fingerprint tracking

## 🎯 Advanced Examples

### Bulk Pin Creation

```typescript
const pinterest = new PinterestClient({ headless: true });
await pinterest.init();
await pinterest.login('email@example.com', 'password');

const pins = [
  { imageFile: 'img1.jpg', title: 'Pin 1', boardName: 'My Board' },
  { imageFile: 'img2.jpg', title: 'Pin 2', boardName: 'My Board' },
  // ... more pins
];

for (const pin of pins) {
  await pinterest.createPin(pin);
  await new Promise(r => setTimeout(r, 5000)); // Random delay
}

await pinterest.close();
```

### Auto-Follow Users from Search

```typescript
const pinterest = new PinterestClient();
await pinterest.init();
await pinterest.login('email@example.com', 'password');

const users = await pinterest.search({
  query: 'web developers',
  scope: 'people',
});

for (const user of users.slice(0, 10)) {
  const username = user.url.split('/').filter(Boolean).pop();
  await pinterest.followUser(username);
  await new Promise(r => setTimeout(r, 3000));
}

await pinterest.close();
```

### Scrape and Save Pins

```typescript
const pinterest = new PinterestClient();
await pinterest.init();
await pinterest.login('email@example.com', 'password');

// Get pins from a board
const pins = await pinterest.getBoardPins(
  'https://www.pinterest.com/user/inspiration-board/',
  50
);

// Save to your board
for (const pin of pins) {
  await pinterest.repin(pin.link, 'My Collection');
  await new Promise(r => setTimeout(r, 2000));
}

await pinterest.close();
```

### Automated Engagement

```typescript
const pinterest = new PinterestClient();
await pinterest.init();
await pinterest.login('email@example.com', 'password');

const results = await pinterest.search({
  query: 'typescript programming',
  scope: 'pins',
});

for (const result of results.slice(0, 5)) {
  // Like the pin
  await pinterest.likePin(result.url);
  
  // Repin it
  await pinterest.repin(result.url, 'My Collection');
  
  // Add a comment
  await pinterest.commentOnPin(result.url, 'Great content! 👍');
  
  // Random delay
  await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));
}

await pinterest.close();
```

## 🏗️ Architecture

```
pinterest-js-client/
├── src/
│   ├── PinterestClient.ts      # Main client class
│   ├── types.ts                # TypeScript interfaces
│   ├── index.ts                # Main exports
│   ├── example.ts              # Usage examples
│   └── utils/
│       └── stealth.ts          # Stealth utilities and fingerprinting
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### External Cookie Storage (Optional)

For multi-account or custom storage needs (databases, credential managers):

```typescript
const pinterest = new PinterestClient({
  cookies: loadedCookies,      // Provide existing cookies
  disableFileCookies: true,    // Disable file-based storage
  onCookiesUpdate: async (cookies) => {
    await saveToDatabase(cookies);  // Save to your storage
  },
});
```

## 🔒 Security & Privacy

- **Cookie Management**: Flexible storage options (file, memory, database, etc.)
- **Proxy Support**: Use proxies to mask your IP address
- **Fingerprint Randomization**: Each session gets unique browser fingerprints
- **No Data Collection**: This library doesn't collect or send any user data

## ⚠️ Disclaimer

This library is for educational purposes only. Make sure to:
- Comply with Pinterest's Terms of Service
- Respect rate limits and avoid aggressive automation
- Use responsibly and ethically
- Test in development before production use

## 🔧 Development

### Build the project

```bash
npm run build
```

### Run the example

```bash
npm run example
```

### Watch mode

```bash
npm run dev
```

## 📝 API Reference

### PinterestClient Class

#### Constructor Options
```typescript
interface PinterestOptions {
  email?: string;
  password?: string;
  headless?: boolean;
  userDataDir?: string;
  proxy?: ProxySettings;
  viewport?: ViewportSize;
  timeout?: number;
  slowMo?: number;
  useFingerprintSuite?: boolean;
  logLevel?: LogLevel;
  cookies?: any[];                    // Optional: pre-loaded cookies
  onCookiesUpdate?: (cookies) => Promise<void>;  // Optional: cookie update callback
  disableFileCookies?: boolean;       // Optional: disable file storage
  cookiesPath?: string;               // Optional: custom cookie file path
}
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `init()` | Initialize browser and context | `Promise<boolean>` |
| `login(email, password)` | Login to Pinterest | `Promise<boolean>` |
| `createPin(pinData)` | Create a new pin | `Promise<boolean>` |
| `createBoard(boardData)` | Create a new board | `Promise<boolean>` |
| `repin(pinUrl, boardName?)` | Repin/save a pin | `Promise<boolean>` |
| `likePin(pinUrl)` | Like a pin | `Promise<boolean>` |
| `commentOnPin(pinUrl, comment)` | Comment on a pin | `Promise<boolean>` |
| `deletePin(pinUrl)` | Delete a pin | `Promise<boolean>` |
| `followUser(username)` | Follow a user | `Promise<boolean>` |
| `unfollowUser(username)` | Unfollow a user | `Promise<boolean>` |
| `followBoard(boardUrl)` | Follow a board | `Promise<boolean>` |
| `search(options)` | Search pins/boards/users | `Promise<any[]>` |
| `getUserProfile(username)` | Get user profile info | `Promise<UserProfile \| null>` |
| `getBoardPins(boardUrl, limit)` | Get pins from a board | `Promise<Pin[]>` |
| `getUserBoards(username)` | Get user's boards | `Promise<Board[]>` |
| `screenshot(path)` | Take a screenshot | `Promise<void>` |
| `getPage()` | Get Playwright page | `Page \| null` |
| `isAuthenticated()` | Check login status | `boolean` |
| `getCookies()` | Get current session cookies | `Promise<any[]>` |
| `saveCookies()` | Save cookies (file/callback) | `Promise<void>` |
| `close()` | Close browser | `Promise<void>` |

### StealthManager Class

Handles all stealth and anti-detection features:

- `createStealthContext(browser)` - Creates context with fingerprints
- `applyStealthToPage(page)` - Applies stealth scripts to page
- `randomDelay(min, max)` - Random human-like delays
- `humanMouseMove(page, selector)` - Natural mouse movements
- `humanType(page, selector, text)` - Human-like typing
- `humanScroll(page, distance)` - Natural scrolling

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🌟 Features Comparison

| Feature | py3-pinterest | pinterest-js-client |
|---------|--------------|---------|
| Language | Python | TypeScript |
| Browser Automation | Selenium | Playwright |
| Stealth Features | Basic | Advanced |
| Fingerprint Suite | ❌ | ✅ |
| Human Behavior | Basic | Advanced |
| Anti-Detection | Limited | Comprehensive |
| Type Safety | ❌ | ✅ |
| Async/Await | ✅ | ✅ |
| Cookie Management | ✅ | ✅ |
| Proxy Support | ✅ | ✅ |

## 🔗 Related Projects

- [Playwright](https://playwright.dev/) - Browser automation framework
- [Fingerprint Injector](https://www.npmjs.com/package/fingerprint-injector) - Browser fingerprinting
- [Fingerprint Generator](https://www.npmjs.com/package/fingerprint-generator) - Fingerprint generation
- [py3-pinterest](https://github.com/bstoilov/py3-pinterest) - Original Python library

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Made with ❤️ and TypeScript**

**⚡ Happy Pinning! ⚡**

