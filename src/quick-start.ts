/**
 * Quick Start Example for AutoPin
 * A simple example to get you started quickly
 */

import { PinterestClient } from './PinterestClient';

async function quickStart() {
  // Create client
  const pinterest = new PinterestClient({
    headless: false,           // Show browser window
    useFingerprintSuite: true, // Enable stealth features
  });

  try {
    // Initialize
    console.log('Initializing...');
    await pinterest.init();

    // Login
    console.log('Logging in...');
    const success = await pinterest.login(
      'your-email@example.com',  // CHANGE THIS
      'your-password'             // CHANGE THIS
    );

    if (!success) {
      console.error('Login failed!');
      return;
    }

    console.log('✅ Successfully logged in!');

    // Example: Search for pins
    console.log('\n🔍 Searching for pins...');
    const pins = await pinterest.search({
      query: 'web development',
      scope: 'pins',
    });
    console.log(`Found ${pins.length} pins!`);

    // Example: Get user profile
    console.log('\n👤 Getting user profile...');
    const profile = await pinterest.getUserProfile('pinterest');
    console.log('Profile:', profile);

    // Example: Create a board (uncomment to use)
    // console.log('\n📋 Creating a board...');
    // await pinterest.createBoard({
    //   name: 'My Test Board',
    //   description: 'Created with AutoPin',
    // });

    // Example: Create a pin (uncomment to use)
    // console.log('\n📌 Creating a pin...');
    // await pinterest.createPin({
    //   imageFile: 'path/to/image.jpg',
    //   title: 'My First Pin',
    //   description: 'Created with AutoPin!',
    //   boardName: 'My Test Board',
    // });

    console.log('\n✨ All done!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Always close the browser
    await pinterest.close();
  }
}

// Run it
quickStart();


