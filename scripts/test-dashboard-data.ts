/**
 * Test script to verify Firestore data availability for dashboard
 */
import { firestore } from '../lib/firebase';

async function testDashboardData() {
  console.log('Testing dashboard data availability...');
  
  try {
    // Test members collection
    console.log('\n--- Testing Members Collection ---');
    const membersResult = await firestore.queryDocuments('members', [
      { field: 'status', operator: '==', value: 'active' }
    ]);
    console.log('Members query result:', membersResult);
    
    // Test all members
    const allMembersResult = await firestore.getCollection('members');
    console.log('All members result:', allMembersResult);
    
    // Test loanRequests collection
    console.log('\n--- Testing Loan Requests Collection ---');
    const pendingRequestsResult = await firestore.queryDocuments('loanRequests', [
      { field: 'status', operator: '==', value: 'pending' }
    ]);
    console.log('Pending requests result:', pendingRequestsResult);
    
    // Test all loan requests
    const allLoanRequestsResult = await firestore.getCollection('loanRequests');
    console.log('All loan requests result:', allLoanRequestsResult);
    
    // Test loans collection
    console.log('\n--- Testing Loans Collection ---');
    const activeLoansResult = await firestore.queryDocuments('loans', [
      { field: 'status', operator: '==', value: 'active' }
    ]);
    console.log('Active loans result:', activeLoansResult);
    
    // Test all loans
    const allLoansResult = await firestore.getCollection('loans');
    console.log('All loans result:', allLoansResult);
    
    // Test savings collection
    console.log('\n--- Testing Savings Collection ---');
    const savingsResult = await firestore.getCollection('savings');
    console.log('Savings result:', savingsResult);
    
    if (savingsResult.success && savingsResult.data) {
      console.log('Sample savings data:', savingsResult.data.slice(0, 2));
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testDashboardData();