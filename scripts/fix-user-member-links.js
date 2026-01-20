#!/usr/bin/env node

/**
 * Script to fix existing user-member link inconsistencies
 * This script will:
 * 1. Identify users without corresponding member records
 * 2. Create missing member records with consistent IDs
 * 3. Fix incorrect userId linkages in existing member records
 * 4. Normalize role values across both collections
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Generate consistent user ID from email
 */
function generateUserId(email) {
  return encodeURIComponent(email.toLowerCase());
}

/**
 * Normalize role string
 */
function normalizeRole(role) {
  if (!role) return 'member';
  return role.toLowerCase().trim();
}

/**
 * Create member document from user data
 */
function createMemberFromUser(userData, userId) {
  const fullName = userData.displayName || userData.fullName || 
                   `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                   'User';
  
  return {
    firstName: userData.firstName || fullName.split(' ')[0] || '',
    lastName: userData.lastName || fullName.split(' ').slice(-1)[0] || '',
    middleName: userData.middleName || '',
    suffix: userData.suffix || '',
    fullName: fullName,
    email: userData.email,
    phoneNumber: userData.contactNumber || userData.phoneNumber || '',
    birthdate: userData.birthdate || '',
    role: normalizeRole(userData.role),
    driverInfo: userData.driverInfo || null,
    operatorInfo: userData.operatorInfo || null,
    status: 'Active',
    userId: userId,
    createdAt: userData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function fixUserMemberLinks() {
  console.log('🚀 Starting user-member link fix process...\n');
  
  try {
    // Step 1: Get all users
    console.log('1. Fetching all users...');
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`   Found ${users.length} user documents`);
    
    // Step 2: Get all members
    console.log('2. Fetching all members...');
    const membersSnapshot = await db.collection('members').get();
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`   Found ${members.length} member documents`);
    
    // Step 3: Identify issues
    console.log('3. Analyzing user-member linkages...\n');
    
    const issues = {
      missingMembers: [],
      incorrectLinks: [],
      duplicateMembers: [],
      roleMismatches: []
    };
    
    // Check each user
    for (const user of users) {
      const expectedMemberId = user.id; // User ID should match member ID
      
      // Find corresponding member
      const correspondingMember = members.find(m => m.id === expectedMemberId);
      
      if (!correspondingMember) {
        issues.missingMembers.push({
          userId: user.id,
          email: user.email,
          userData: user
        });
        continue;
      }
      
      // Check linkage correctness
      if (correspondingMember.userId !== user.id) {
        issues.incorrectLinks.push({
          userId: user.id,
          memberId: correspondingMember.id,
          currentUserId: correspondingMember.userId,
          expectedUserId: user.id
        });
      }
      
      // Check email consistency
      if (correspondingMember.email !== user.email) {
        issues.incorrectLinks.push({
          userId: user.id,
          memberId: correspondingMember.id,
          issue: 'email_mismatch',
          userEmail: user.email,
          memberEmail: correspondingMember.email
        });
      }
      
      // Check role consistency
      const userRole = normalizeRole(user.role);
      const memberRole = normalizeRole(correspondingMember.role);
      
      if (userRole !== memberRole) {
        issues.roleMismatches.push({
          userId: user.id,
          userRole: user.role,
          memberRole: correspondingMember.role,
          normalizedUserRole: userRole,
          normalizedMemberRole: memberRole
        });
      }
    }
    
    // Look for duplicate members (same email, different IDs)
    const emailToMembers = new Map();
    members.forEach(member => {
      if (member.email) {
        if (!emailToMembers.has(member.email)) {
          emailToMembers.set(member.email, []);
        }
        emailToMembers.get(member.email).push(member);
      }
    });
    
    emailToMembers.forEach((memberList, email) => {
      if (memberList.length > 1) {
        issues.duplicateMembers.push({
          email: email,
          members: memberList.map(m => ({ id: m.id, userId: m.userId }))
        });
      }
    });
    
    // Report findings
    console.log('🔍 Analysis Results:');
    console.log(`   Missing members: ${issues.missingMembers.length}`);
    console.log(`   Incorrect links: ${issues.incorrectLinks.length}`);
    console.log(`   Duplicate members: ${issues.duplicateMembers.length}`);
    console.log(`   Role mismatches: ${issues.roleMismatches.length}\n`);
    
    // Step 4: Apply fixes
    console.log('4. Applying fixes...\n');
    
    let fixesApplied = 0;
    
    // Fix missing members
    if (issues.missingMembers.length > 0) {
      console.log(`   Creating ${issues.missingMembers.length} missing member records...`);
      for (const issue of issues.missingMembers) {
        try {
          const memberData = createMemberFromUser(issue.userData, issue.userId);
          await db.collection('members').doc(issue.userId).set(memberData);
          console.log(`     ✅ Created member for ${issue.email}`);
          fixesApplied++;
        } catch (error) {
          console.error(`     ❌ Failed to create member for ${issue.email}:`, error.message);
        }
      }
    }
    
    // Fix incorrect links
    if (issues.incorrectLinks.length > 0) {
      console.log(`   Fixing ${issues.incorrectLinks.length} incorrect linkages...`);
      for (const issue of issues.incorrectLinks) {
        try {
          if (issue.issue === 'email_mismatch') {
            await db.collection('members').doc(issue.memberId).update({
              userId: issue.expectedUserId,
              email: issue.userEmail,
              updatedAt: new Date().toISOString()
            });
          } else {
            await db.collection('members').doc(issue.memberId).update({
              userId: issue.expectedUserId,
              updatedAt: new Date().toISOString()
            });
          }
          console.log(`     ✅ Fixed linkage for user ${issue.userId}`);
          fixesApplied++;
        } catch (error) {
          console.error(`     ❌ Failed to fix linkage for user ${issue.userId}:`, error.message);
        }
      }
    }
    
    // Fix role mismatches
    if (issues.roleMismatches.length > 0) {
      console.log(`   Fixing ${issues.roleMismatches.length} role mismatches...`);
      for (const issue of issues.roleMismatches) {
        try {
          // Prefer user role as source of truth
          await db.collection('members').doc(issue.userId).update({
            role: issue.normalizedUserRole,
            updatedAt: new Date().toISOString()
          });
          console.log(`     ✅ Fixed role mismatch for user ${issue.userId}`);
          fixesApplied++;
        } catch (error) {
          console.error(`     ❌ Failed to fix role for user ${issue.userId}:`, error.message);
        }
      }
    }
    
    // Handle duplicates (merge or remove)
    if (issues.duplicateMembers.length > 0) {
      console.log(`   Processing ${issues.duplicateMembers.length} duplicate member records...`);
      for (const issue of issues.duplicateMembers) {
        try {
          // Keep the member with correct userId linkage, remove others
          const correctMember = issue.members.find(m => m.userId === generateUserId(issue.email));
          
          if (correctMember) {
            // Remove incorrect duplicates
            const incorrectMembers = issue.members.filter(m => m.id !== correctMember.id);
            for (const incorrectMember of incorrectMembers) {
              await db.collection('members').doc(incorrectMember.id).delete();
              console.log(`     ✅ Removed duplicate member ${incorrectMember.id} for ${issue.email}`);
              fixesApplied++;
            }
          } else {
            // No correct member found, keep first one and fix it
            const memberToKeep = issue.members[0];
            const otherMembers = issue.members.slice(1);
            
            // Fix the kept member
            await db.collection('members').doc(memberToKeep.id).update({
              userId: generateUserId(issue.email),
              updatedAt: new Date().toISOString()
            });
            
            // Remove others
            for (const otherMember of otherMembers) {
              await db.collection('members').doc(otherMember.id).delete();
              console.log(`     ✅ Removed duplicate member ${otherMember.id} for ${issue.email}`);
              fixesApplied++;
            }
          }
        } catch (error) {
          console.error(`     ❌ Failed to process duplicates for ${issue.email}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Fix process completed! Applied ${fixesApplied} fixes.`);
    console.log('\n📋 Summary:');
    console.log('   - All users now have corresponding member records');
    console.log('   - User IDs and member IDs are consistent');
    console.log('   - Email addresses match between collections');
    console.log('   - Roles are normalized and consistent');
    console.log('   - Duplicate member records removed');
    
  } catch (error) {
    console.error('❌ Error during fix process:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixUserMemberLinks()
    .then(() => {
      console.log('\n🎉 User-member link fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix process failed:', error);
      process.exit(1);
    });
}

module.exports = { fixUserMemberLinks };