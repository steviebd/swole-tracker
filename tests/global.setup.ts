import { clerkSetup } from '@clerk/testing/playwright';

async function globalSetup() {
  console.log('Starting global setup...');
  
  // Check if required environment variables are set
  console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'Set' : 'Missing');
  console.log('CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY ? 'Set' : 'Missing');
  
  try {
    await clerkSetup();
    console.log('Clerk setup completed successfully');
  } catch (error) {
    console.error('Clerk setup failed:', error);
    throw error;
  }
}

export default globalSetup;
