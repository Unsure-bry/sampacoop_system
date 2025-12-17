#!/usr/bin/env node

// Debug the member records page logic
console.log('Debugging Member Records Page Logic');
console.log('==================================');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin to simulate the data processing
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.log('❌ ERROR: Missing required environment variables');
  process.exit(1);
}

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }

  const db = admin.firestore();
  console.log('✅ Firebase Admin initialized successfully');

  // Simulate the fetchMembers function logic
  async function debugFetchMembers() {
    console.log('\n--- Simulating fetchMembers function ---');
    
    try {
      // First try to fetch from 'members' collection
      console.log('Fetching from members collection...');
      const membersSnapshot = await db.collection('members').get();
      
      if (membersSnapshot.empty) {
        console.log('No data in members collection, trying users collection');
        const usersSnapshot = await db.collection('users').get();
        
        if (!usersSnapshot.empty) {
          console.log('Processing users collection data...');
          // Filter for users with member roles
          const membersData = [];
          usersSnapshot.forEach(doc => {
            const data = doc.data();
            const role = data.role ? data.role.toLowerCase() : '';
            if (role && ['member', 'driver', 'operator'].includes(role)) {
              const processedMember = {
                id: doc.id,
                firstName: data.firstName || data.fullName?.split(' ')[0] || 'Unknown',
                lastName: data.lastName || data.fullName?.split(' ').slice(-1)[0] || 'User',
                middleName: data.middleName || '',
                suffix: data.suffix || '',
                role: data.role || 'Member',
                email: data.email || '',
                phoneNumber: data.contactNumber || data.phoneNumber || '',
                birthdate: data.birthdate || '',
                age: data.age || 0,
                status: data.status || 'Active',
                createdAt: data.createdAt || new Date().toISOString(),
                archived: data.archived || false,
                driverInfo: data.driverInfo || null,
                operatorInfo: data.operatorInfo || null,
                ...data
              };
              membersData.push(processedMember);
            }
          });
          
          console.log(`✅ Processed ${membersData.length} members from users collection`);
          return membersData;
        }
      } else {
        console.log('Processing members collection data...');
        // Process members from the members collection
        const membersData = [];
        membersSnapshot.forEach(doc => {
          const data = doc.data();
          const processedMember = {
            id: doc.id,
            firstName: data.firstName || 
                      data.fullName?.split(' ')[0] || 
                      data.displayName?.split(' ')[0] || 
                      'Unknown',
            lastName: data.lastName || 
                     data.fullName?.split(' ').slice(-1)[0] || 
                     data.displayName?.split(' ').slice(-1)[0] || 
                     'User',
            middleName: data.middleName || '',
            suffix: data.suffix || '',
            role: data.role || 'Member',
            email: data.email || '',
            phoneNumber: data.contactNumber || data.phoneNumber || '',
            birthdate: data.birthdate || '',
            age: data.age || 0,
            status: data.status || 'Active',
            createdAt: data.createdAt || new Date().toISOString(),
            archived: data.archived || false,
            driverInfo: data.driverInfo || null,
            operatorInfo: data.operatorInfo || null,
            ...data
          };
          membersData.push(processedMember);
        });
        
        console.log(`✅ Processed ${membersData.length} members from members collection`);
        return membersData;
      }
    } catch (error) {
      console.error('❌ Error in fetchMembers simulation:', error.message);
      return [];
    }
  }

  // Simulate the filterMembers function logic
  function debugFilterMembers(members, activeTab = 'active', searchTerm = '') {
    console.log('\n--- Simulating filterMembers function ---');
    console.log(`Input: ${members.length} members, activeTab: ${activeTab}, searchTerm: "${searchTerm}"`);
    
    // Check if members data is loaded
    if (!members || members.length === 0) {
      console.log('No members to filter');
      return [];
    }
    
    // Filter by active/archived status first
    const statusFiltered = members.filter(member => {
      if (activeTab === 'active') {
        return !member.archived;
      } else {
        return member.archived === true;
      }
    });
    
    console.log(`After status filter (${activeTab}): ${statusFiltered.length} members`);

    // Then apply search filter
    if (!searchTerm) {
      console.log('No search term, returning status-filtered members');
      return statusFiltered;
    }

    const term = searchTerm.toLowerCase();
    const filtered = statusFiltered.filter(member => {
      // Safely handle potentially undefined fields
      const firstName = member.firstName || '';
      const lastName = member.lastName || '';
      const email = member.email || '';
      const id = member.id || '';
      const middleName = member.middleName || '';
      const suffix = member.suffix || '';
      
      const match = (
        firstName.toLowerCase().includes(term) ||
        lastName.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        id.toLowerCase().includes(term) ||
        middleName.toLowerCase().includes(term) ||
        suffix.toLowerCase().includes(term)
      );
      
      return match;
    });
    
    console.log(`After search filter ("${term}"): ${filtered.length} members`);
    return filtered;
  }

  // Run the debug simulation
  async function runDebug() {
    try {
      // Fetch members
      const members = await debugFetchMembers();
      
      console.log(`\n--- FETCH RESULT ---`);
      console.log(`Total members fetched: ${members.length}`);
      
      if (members.length > 0) {
        console.log('\nSample members:');
        members.slice(0, 3).forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.firstName} ${member.lastName} (${member.email || 'No email'}) - ${member.role} - ${member.archived ? 'Archived' : 'Active'}`);
        });
      }
      
      // Test filtering
      console.log('\n--- TESTING FILTERS ---');
      
      // Test 1: Active members only
      const activeMembers = debugFilterMembers(members, 'active', '');
      console.log(`Active members: ${activeMembers.length}`);
      
      // Test 2: Archived members only
      const archivedMembers = debugFilterMembers(members, 'archived', '');
      console.log(`Archived members: ${archivedMembers.length}`);
      
      // Test 3: Search for "Axl"
      const searchResults = debugFilterMembers(members, 'active', 'Axl');
      console.log(`Search "Axl" results: ${searchResults.length}`);
      
      console.log('\n✅ Debug simulation completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Debug simulation failed:', error.message);
      process.exit(1);
    }
  }

  runDebug();

} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}