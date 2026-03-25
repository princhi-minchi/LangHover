// Simple API test script - run this in the browser console to debug
import { apiService } from './services/apiService.js';

// Test API connectivity
async function testApiConnection() {
  console.log('=== API Connection Test ===');
  
  // Show current configuration
  console.log('Base URL:', apiService.getBaseUrl());
  
  try {
    // Test health check
    const health = await apiService.healthCheck();
    console.log('Health check result:', health);
    
    // Test actual conjugation lookup
    const testData = await apiService.lookupConjugation('it', {
      selection: 'parlo',
      selectionContext: 'Io parlo italiano'
    });
    console.log('Conjugation test result:', testData);
    
  } catch (error) {
    console.error('API test failed:', error);
  }
}

// Run the test
testApiConnection();
