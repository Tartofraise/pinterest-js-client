/**
 * Example usage of AutoPin - Pinterest Automation Library
 * This file demonstrates all the features available in the library
 */

import { PinterestClient } from './PinterestClient';
import { PinData, BoardData, SearchOptions } from './types';
import { LogLevel } from './utils/logger';

async function main() {
  // Create a new Pinterest client with options
  const pinterest = new PinterestClient({
    headless: false,              // Set to true for headless mode
    slowMo: 100,                  // Slow down actions by 100ms for more human-like behavior
    timeout: 30000,               // Default timeout of 30 seconds
    useFingerprintSuite: true,    // Enable fingerprint suite for undetected browsing
    viewport: {
      width: 1920,
      height: 1080,
    },
    logLevel: LogLevel.INFO,
    // Uncomment to use a proxy
    // proxy: {
    //   server: 'http://proxy.example.com:8080',
    //   username: 'user',
    //   password: 'pass',
    // },
  });

  try {
    // Initialize the client
    console.log('\n=== Initializing Pinterest Client ===');
    const isAlreadyLoggedIn = await pinterest.init();
    console.log(`✓ Client initialized - Already logged in: ${isAlreadyLoggedIn}`);
    
    // Only login if not already logged in
    if (!isAlreadyLoggedIn) {
      console.log('\n=== Logging in ===');
      const email = process.env.PINTEREST_EMAIL || 'email@example.com';
      const password = process.env.PINTEREST_PASSWORD || 'password';
      const loginSuccess = await pinterest.login(email, password);
      if (!loginSuccess) {
        console.error('Login failed! Please check credentials.');
        return;
      }
      console.log('✓ Successfully logged in!');
    }
    else {
      console.log('✓ Using existing session (cookies are valid)');
    }

    // Wait a bit after login
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ============================================================
    // BOARD OPERATIONS
    // ============================================================

    // Create a new board
    /*
    console.log('\n=== Creating a New Board ===');
    const newBoard: BoardData = {
      name: 'My Awesome Board',
      description: 'A collection of amazing pins',
      privacy: 'public',
    };
    await pinterest.createBoard(newBoard);
    */

    // Get user's boards
    /*
    console.log('\n=== Getting User Boards ===');
    const boards = await pinterest.getUserBoards('pinterest'); // Replace with your username
    console.log('Boards:', boards);
    */

    // ============================================================
    // PIN OPERATIONS
    // ============================================================
    
    // Create a new pin
    /*
    console.log('\n=== Creating a New Pin ===');
    const newPin: PinData = {
      imageFile: 'C:/Users/tartofraise/Downloads/replicate-prediction-1xkftcma7drme0ct1fhb1f148r.jpeg',  // Path to local image file
      title: 'Scrabble',
      description: 'Scrabble',
      link: 'https://mistergift.fr',
      boardName: 'Idées cadeaux',
      altText: 'scrabble',
    };
    await pinterest.createPin(newPin);
    */


    const pinUrlToRepin = 'https://fr.pinterest.com/pin/577023771049520662/';

    // Repin (save) an existing pin TODO
    
    /*
    console.log('\n=== Repinning a Pin ===');
    await pinterest.repin(pinUrlToRepin, 'My Awesome Board');
    */

    // Like a pin
    /*
    console.log('\n=== Liking a Pin ===');
    await pinterest.likePin(pinUrlToRepin);
    */

    // Comment on a pin
    /*
    console.log('\n=== Commenting on a Pin ===');
    await pinterest.commentOnPin(pinUrlToRepin, 'Amazing pin! 😍');
    */

    // Get pins from a board
    /*
    console.log('\n=== Getting Pins from a Board ===');
    const boardUrl = 'https://fr.pinterest.com/elmo8480/video/';
    const pins = await pinterest.getBoardPins(boardUrl, 20);
    console.log('Pins:', pins);    
    */

    // Delete a pin TODO
    /*console.log('\n=== Deleting a Pin ===');
    await pinterest.deletePin(pinUrlToRepin);
    */

    // ============================================================
    // USER OPERATIONS
    // ============================================================

    // Follow a user
    
    console.log('\n=== Following a User ===');
    await pinterest.followUser('pinterest');
    

    // Unfollow a user
    /*console.log('\n=== Unfollowing a User ===');
    await pinterest.unfollowUser('someusername');
    */

    // Get user profile
    console.log('\n=== Getting User Profile ===');
    const profile = await pinterest.getUserProfile('pinterest');
    console.log('Profile:', profile);

    // Follow a board
    
    /*console.log('\n=== Following a Board ===');
    await pinterest.followBoard('https://fr.pinterest.com/alaqsashop/_tpd_social/');*/
    

    // ============================================================
    // SEARCH OPERATIONS
    // ============================================================

    // Search for pins
    
    /*console.log('\n=== Searching for Pins ===');
    const pinSearchOptions: SearchOptions = {
      query: 'web development',
      scope: 'pins',
      limit: 10,
    };
    const pinResults = await pinterest.search(pinSearchOptions);
    console.log('Pin search results:', pinResults.slice(0, 5));
    */

    // Search for boards
    
    /*console.log('\n=== Searching for Boards ===');
    const boardSearchOptions: SearchOptions = {
      query: 'programming',
      scope: 'boards',
    };
    const boardResults = await pinterest.search(boardSearchOptions);
    console.log('Board search results:', boardResults.slice(0, 5));
    */

    // Search for users
    
    /*
    console.log('\n=== Searching for Users ===');
    const userSearchOptions: SearchOptions = {
      query: 'tech influencer',
      scope: 'people',
    };
    const userResults = await pinterest.search(userSearchOptions);
    console.log('User search results:', userResults.slice(0, 5));
    */

    // ============================================================
    // UTILITY OPERATIONS
    // ============================================================

    // Take a screenshot
    /*
    console.log('\n=== Taking Screenshot ===');
    await pinterest.screenshot('pinterest-screenshot.png');
    */

    // Check authentication status
    console.log('\n=== Checking Authentication ===');
    console.log('Is authenticated:', pinterest.isAuthenticated());

    // Access the page directly for custom operations
    /*
    const page = pinterest.getPage();
    if (page) {
      console.log('\n=== Custom Page Operation ===');
      await page.goto('https://www.pinterest.com/');
      await page.waitForTimeout(2000);
      const title = await page.title();
      console.log('Page title:', title);
    }
      */

    // ============================================================
    // ADVANCED EXAMPLE: Automated Pinterest Activity
    // ============================================================

    //console.log('\n=== Running Automated Activity ===');
    
    // Search and interact with pins
    /*
    const searchResults = await pinterest.search({
      query: 'typescript programming',
      scope: 'pins',
    });

    for (let i = 0; i < Math.min(3, searchResults.length); i++) {
      const result = searchResults[i];
      console.log(`\nProcessing pin ${i + 1}:`, result.title);
      
      // Like the pin
      // await pinterest.likePin(result.url);
      
      // Repin to your board
      // await pinterest.repin(result.url, 'My Awesome Board');
      
      // Add a comment
      // await pinterest.commentOnPin(result.url, 'Great content! 👍');
      
      // Random delay between actions
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    }
    */

    console.log('\n=== All operations completed successfully! ===');

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Always close the browser when done
    console.log('\n=== Closing Pinterest Client ===');
    await pinterest.close();
  }
}

// Run the example
main().catch(console.error);

