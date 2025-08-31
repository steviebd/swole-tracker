// Simple script to test authentication flow
import puppeteer from 'puppeteer';

async function testAuthFlow() {
  console.log('Starting authentication workflow test...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('1. Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Take a screenshot of the homepage
    await page.screenshot({ path: 'homepage.png' });
    console.log('   ✓ Homepage loaded, screenshot saved as homepage.png');
    
    // Look for sign-in button or link
    console.log('2. Looking for authentication elements...');
    
    const signInElements = await page.$$eval('a, button', elements => {
      return elements
        .filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('sign in') || text.includes('login') || 
                 el.href?.includes('sign-in') || el.href?.includes('login');
        })
        .map(el => ({
          text: el.textContent?.trim(),
          href: el.href,
          tagName: el.tagName
        }));
    });
    
    console.log('   Found sign-in elements:', signInElements);
    
    if (signInElements.length > 0) {
      console.log('3. Attempting to click sign-in...');
      
      // Try to click the first sign-in element
      const signInSelector = signInElements[0].href 
        ? `a[href*="sign-in"], a[href*="login"]`
        : 'button, a';
        
      await page.click(signInSelector);
      
      // Wait for navigation or modal to appear
      try {
        await page.waitForNavigation({ 
          waitUntil: 'networkidle0', 
          timeout: 5000 
        });
      } catch (e) {
        console.log('   No navigation occurred, checking for modals...');
      }
      
      await page.screenshot({ path: 'after-signin-click.png' });
      console.log('   ✓ After sign-in click, screenshot saved as after-signin-click.png');
      
      // Check if we're on a WorkOS page
      const currentUrl = page.url();
      console.log('   Current URL:', currentUrl);
      
      if (currentUrl.includes('workos.com') || currentUrl.includes('auth')) {
        console.log('   ✓ Successfully redirected to authentication provider!');
        
        // Try to find email input and test with provided credentials
        try {
          const emailInput = await page.$('input[type="email"]');
          if (emailInput) {
            console.log('4. Found email input, testing with credentials...');
            await page.type('input[type="email"]', 'stevenbduong@gmail.com');
            
            const passwordInput = await page.$('input[type="password"]');
            if (passwordInput) {
              await page.type('input[type="password"]', 'darkdraogn');
              
              // Look for submit button
              const submitButton = await page.$('button[type="submit"], input[type="submit"], button');
              if (submitButton) {
                await submitButton.click();
                
                // Wait to see what happens
                await page.waitForTimeout(3000);
                await page.screenshot({ path: 'after-login-attempt.png' });
                console.log('   ✓ Login attempt completed, screenshot saved as after-login-attempt.png');
                console.log('   Final URL:', page.url());
              }
            }
          }
        } catch (e) {
          console.log('   Login form interaction failed:', e.message);
        }
      }
      
    } else {
      console.log('   ⚠ No sign-in elements found on the page');
    }
    
    // Test a protected route
    console.log('5. Testing protected route /connect-whoop...');
    await page.goto('http://localhost:3000/connect-whoop', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    await page.screenshot({ path: 'protected-route.png' });
    console.log('   ✓ Protected route test completed, screenshot saved as protected-route.png');
    console.log('   Final URL for protected route:', page.url());
    
    console.log('\n✅ Authentication workflow test completed!');
    console.log('📸 Screenshots saved:');
    console.log('   - homepage.png');
    console.log('   - after-signin-click.png');  
    console.log('   - after-login-attempt.png');
    console.log('   - protected-route.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is available
try {
  testAuthFlow();
} catch (error) {
  console.log('❌ Puppeteer not available. Please install it first:');
  console.log('   bun add puppeteer');
  console.log('');
  console.log('🔗 Manual testing instructions:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Look for sign-in/login button');
  console.log('3. Click it and verify redirect to WorkOS');
  console.log('4. Try credentials: stevenbduong@gmail.com / darkdraogn');
  console.log('5. Test protected routes like /connect-whoop');
  console.log('6. Verify middleware no longer shows withAuth errors');
}