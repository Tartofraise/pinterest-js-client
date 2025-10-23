# Setup Guide for AutoPin

This guide will help you set up AutoPin for Pinterest automation.

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- A Pinterest account
- Basic knowledge of TypeScript/JavaScript

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `playwright` - Browser automation framework
- `fingerprint-injector` - Fingerprint injection for stealth
- `fingerprint-generator` - Fingerprint generation

### 2. Install Playwright Browsers

Playwright needs to download browser binaries:

```bash
npx playwright install chromium
```

You only need Chromium for this library.

### 3. Configure Credentials

Create a `.env` file (optional):

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
PINTEREST_EMAIL=your-email@example.com
PINTEREST_PASSWORD=your-password
PINTEREST_USERNAME=your-username
```

**Note:** You can also pass credentials directly when initializing the client.

### 4. Build the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates the `dist/` directory with compiled code.

### 5. Test the Setup

Run the quick-start example:

```bash
npm run test
```

Or run with ts-node:

```bash
npx ts-node src/quick-start.ts
```

## Configuration Options

### Basic Configuration

```typescript
import { PinterestClient } from './src/PinterestClient';

const pinterest = new PinterestClient({
  headless: false,           // Show browser window
  useFingerprintSuite: true, // Enable stealth features
});
```

### Advanced Configuration

```typescript
const pinterest = new PinterestClient({
  // Authentication
  email: 'your-email@example.com',
  password: 'your-password',
  
  // Browser options
  headless: false,           // false = visible, true = headless
  slowMo: 100,              // Slow down by 100ms per action
  timeout: 30000,           // Default timeout (30 seconds)
  
  // Viewport
  viewport: {
    width: 1920,
    height: 1080,
  },
  
  // Stealth
  useFingerprintSuite: true, // Enable fingerprint randomization
  
  // Session persistence
  userDataDir: './user-data', // Save browser data
  
  // Proxy (optional)
  proxy: {
    server: 'http://proxy.example.com:8080',
    username: 'user',
    password: 'pass',
  },
});
```

## First Steps

### 1. Initialize and Login

```typescript
await pinterest.init();
await pinterest.login('email@example.com', 'password');
```

### 2. Perform Actions

```typescript
// Search for pins
const pins = await pinterest.search({
  query: 'web development',
  scope: 'pins',
});

// Create a board
await pinterest.createBoard({
  name: 'My Board',
  description: 'My awesome collection',
});

// Repin
await pinterest.repin('https://www.pinterest.com/pin/123456789/');
```

### 3. Close When Done

```typescript
await pinterest.close();
```

## Project Structure

```
autopin/
├── src/
│   ├── PinterestClient.ts      # Main client class
│   ├── types.ts                # TypeScript interfaces
│   ├── index.ts                # Main exports
│   ├── example.ts              # Comprehensive examples
│   ├── quick-start.ts          # Quick start guide
│   └── utils/
│       ├── stealth.ts          # Stealth features
│       ├── logger.ts           # Logging utility
│       └── helpers.ts          # Helper functions
├── dist/                       # Compiled JavaScript (after build)
├── package.json               # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # Documentation
```

## Common Issues

### Issue: Playwright browsers not installed

**Error:** `browserType.launch: Executable doesn't exist`

**Solution:**
```bash
npx playwright install chromium
```

### Issue: Login fails

**Possible causes:**
1. Wrong credentials
2. Pinterest security check (CAPTCHA)
3. Too many login attempts

**Solutions:**
- Verify credentials
- Try in non-headless mode (`headless: false`)
- Wait and try again later
- Complete CAPTCHA manually if it appears

### Issue: Elements not found

**Error:** `Timeout waiting for selector`

**Solutions:**
- Increase timeout: `{ timeout: 60000 }`
- Pinterest UI may have changed (selectors need updating)
- Check internet connection
- Ensure page is fully loaded

### Issue: Detection by Pinterest

**Solutions:**
- Use `useFingerprintSuite: true`
- Add more delays: `slowMo: 200`
- Use a proxy
- Limit actions per session
- Use `userDataDir` for persistent sessions

### Issue: TypeScript errors

**Solution:**
```bash
npm run build
```

If errors persist, check `tsconfig.json` configuration.

## Performance Tips

### 1. Use Headless Mode for Production

```typescript
const pinterest = new PinterestClient({
  headless: true, // Faster and uses less resources
});
```

### 2. Reuse Sessions

```typescript
const pinterest = new PinterestClient({
  userDataDir: './pinterest-session', // Saves cookies and state
});
```

This avoids logging in every time.

### 3. Rate Limiting

Don't make too many requests too quickly:

```typescript
import { RateLimiter } from './src/utils/helpers';

const limiter = new RateLimiter(1, 2000); // 1 concurrent, 2s delay

await limiter.execute(() => pinterest.createPin(pin1));
await limiter.execute(() => pinterest.createPin(pin2));
```

### 4. Batch Operations

Process items in batches:

```typescript
import { chunkArray } from './src/utils/helpers';

const pins = [...]; // Large array
const batches = chunkArray(pins, 10); // Process 10 at a time

for (const batch of batches) {
  await Promise.all(batch.map(pin => pinterest.repin(pin)));
  await new Promise(r => setTimeout(r, 5000)); // Delay between batches
}
```

## Security Best Practices

### 1. Never Commit Credentials

Add to `.gitignore`:
```
.env
cookies.json
*.session
user-data/
```

### 2. Use Environment Variables

```typescript
const pinterest = new PinterestClient({
  email: process.env.PINTEREST_EMAIL,
  password: process.env.PINTEREST_PASSWORD,
});
```

### 3. Rotate Proxies

If using proxies, rotate them:

```typescript
const proxies = [
  { server: 'http://proxy1.com:8080', ... },
  { server: 'http://proxy2.com:8080', ... },
];

const proxy = proxies[Math.floor(Math.random() * proxies.length)];
const pinterest = new PinterestClient({ proxy });
```

### 4. Handle Errors Gracefully

```typescript
try {
  await pinterest.createPin(pinData);
} catch (error) {
  console.error('Failed to create pin:', error);
  // Log error, retry, or notify
}
```

## Next Steps

1. Read the [README.md](README.md) for full API documentation
2. Check [example.ts](src/example.ts) for comprehensive examples
3. Customize stealth features in [stealth.ts](src/utils/stealth.ts)
4. Contribute improvements (see [CONTRIBUTING.md](CONTRIBUTING.md))

## Support

For issues or questions:
1. Check this setup guide
2. Read the main README
3. Search existing GitHub issues
4. Create a new issue with details

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Pinterest for Developers](https://developers.pinterest.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Fingerprint Injector](https://www.npmjs.com/package/fingerprint-injector)

---

**Happy Automating! 🚀**

