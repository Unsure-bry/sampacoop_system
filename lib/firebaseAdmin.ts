import admin from "firebase-admin";

// Firebase Admin SDK initialization
// This must run server-side only, never in client components

// Initialize database instance
let db: admin.firestore.Firestore | null = null;

// Flag to track initialization status
let isInitialized = false;
let initializationError: string | null = null;

try {
  // Only initialize if no apps exist
  if (!admin.apps.length) {
    // Check if environment variables are available
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Verify environment variables are set
    console.log("Environment variables check:");
    console.log("FIREBASE_PROJECT_ID:", projectId ? "SET" : "MISSING");
    console.log("FIREBASE_CLIENT_EMAIL:", clientEmail ? "SET" : "MISSING");
    console.log("FIREBASE_PRIVATE_KEY:", privateKey ? "SET" : "MISSING");

    // Validate that all required environment variables are present and not placeholder values
    const isUsingPlaceholders = 
      !projectId || 
      !clientEmail || 
      !privateKey || 
      projectId.includes('REPLACE_WITH') || 
      projectId.includes('your-') || 
      clientEmail.includes('REPLACE_WITH') || 
      clientEmail.includes('your-') || 
      clientEmail.includes('@example.com') || 
      privateKey.includes('REPLACE_WITH') || 
      privateKey.includes('YOUR_PRIVATE_KEY_HERE');

    if (projectId && clientEmail && privateKey && !isUsingPlaceholders) {
      console.log("Initializing Firebase Admin with credentials...");
      
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        
        db = admin.firestore();
        isInitialized = true;
        initializationError = null;
        console.log("Firebase Admin initialized successfully with project:", projectId);
      } catch (initError: any) {
        console.error("Firebase Admin initialization failed:", initError.message);
        initializationError = initError.message;
        console.error("This usually happens when:");
        console.error("1. The private key format is incorrect");
        console.error("2. The project ID doesn't match your Firebase project");
        console.error("3. The service account has been deleted or disabled");
        console.error("Please check your .env.local file and refer to FIREBASE_SETUP_INSTRUCTIONS.md");
        // Set db to null to indicate initialization failure
        db = null;
        isInitialized = false;
      }
    } else {
      console.warn("=== FIREBASE CONFIGURATION ISSUE ===");
      console.warn("Firebase Admin credentials are missing or using placeholder values.");
      console.warn("Current values:");
      console.warn("- Project ID:", projectId || "NOT SET");
      console.warn("- Client Email:", clientEmail || "NOT SET");
      console.warn("- Private Key:", privateKey ? "SET (but may be placeholder)" : "NOT SET");
      console.warn("");
      console.warn("To fix this issue:");
      console.warn("1. Open .env.local file");
      console.warn("2. Replace placeholder values with actual Firebase Admin SDK credentials");
      console.warn("3. Get credentials from Firebase Console -> Project Settings -> Service Accounts");
      console.warn("4. Generate new private key and extract the values");
      console.warn("5. Restart the development server");
      console.warn("");
      console.warn("Refer to FIREBASE_SETUP_INSTRUCTIONS.md for detailed setup instructions.");
      
      // Mark as uninitialized instead of trying fallback initialization
      initializationError = "Firebase Admin credentials are missing or invalid";
      db = null;
      isInitialized = false;
    }
  } else {
    // Use existing app
    try {
      db = admin.firestore();
      isInitialized = true;
      initializationError = null;
    } catch (error: any) {
      console.error("Failed to get Firestore instance from existing app:", error.message);
      initializationError = error.message;
      db = null;
      isInitialized = false;
    }
  }
} catch (error: any) {
  console.error("Firebase Admin initialization failed:", error.message);
  initializationError = error.message;
  db = null;
  isInitialized = false;
}

// Firestore utility functions for server-side operations
export const adminFirestore = {
  // Check if Firebase is properly initialized
  isInitialized: () => {
    return isInitialized && db !== null;
  },
  
  // Get initialization error if any
  getInitializationError: () => {
    return initializationError;
  },
  
  // Get a single document
  getDocument: async (collectionName: string, docId: string) => {
    try {
      // Check if db is initialized
      if (!db) {
        return { success: false, error: 'Database not initialized. Please check your Firebase configuration.' };
      }
      
      // Validate inputs
      if (!collectionName || !docId) {
        return { success: false, error: 'Collection name and document ID are required' };
      }
      
      const docRef = db.collection(collectionName).doc(docId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data();
        return { success: true, data };
      } else {
        return { success: false, error: 'Document not found' };
      }
    } catch (error: any) {
      console.error('Error getting document:', error);
      return { success: false, error: error.message || 'Failed to get document' };
    }
  },
  
  // Query documents
  queryDocuments: async (
    collectionName: string,
    conditions: { field: string; operator: any; value: any }[]
  ) => {
    try {
      // Check if db is initialized
      if (!db) {
        return { success: false, error: 'Database not initialized. Please check your Firebase configuration.' };
      }
      
      // Validate inputs
      if (!collectionName) {
        return { success: false, error: 'Collection name is required' };
      }
      
      let query: admin.firestore.Query = db.collection(collectionName);
      
      // Apply query conditions with validation
      for (const condition of conditions) {
        // Validate condition
        if (!condition.field || !condition.operator || condition.value === undefined) {
          return { success: false, error: 'Invalid query condition. Field, operator, and value are required.' };
        }
        query = query.where(condition.field, condition.operator, condition.value);
      }
      
      // Execute query
      const querySnapshot = await query.get();
      
      // Map results
      const documents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
      
      return { success: true, data: documents };
    } catch (error: any) {
      console.error('Error querying documents:', error);
      return { success: false, error: error.message || 'Failed to query documents. Please check your Firebase configuration.' };
    }
  },
  
  // Update a document
  updateDocument: async (collectionName: string, docId: string, data: any) => {
    try {
      // Check if db is initialized
      if (!db) {
        return { success: false, error: 'Database not initialized. Please check your Firebase configuration.' };
      }
      
      // Validate inputs
      if (!collectionName || !docId) {
        return { success: false, error: 'Collection name and document ID are required' };
      }
      
      await db.collection(collectionName).doc(docId).update(data);
      return { success: true };
    } catch (error: any) {
      console.error('Error updating document:', error);
      return { success: false, error: error.message || 'Failed to update document' };
    }
  },
  
  // Create or set a document
  setDocument: async (collectionName: string, docId: string, data: any) => {
    try {
      // Check if db is initialized
      if (!db) {
        return { success: false, error: 'Database not initialized. Please check your Firebase configuration.' };
      }
      
      // Validate inputs
      if (!collectionName || !docId) {
        return { success: false, error: 'Collection name and document ID are required' };
      }
      
      await db.collection(collectionName).doc(docId).set(data, { merge: true });
      return { success: true };
    } catch (error: any) {
      console.error('Error setting document:', error);
      return { success: false, error: error.message || 'Failed to set document' };
    }
  },
  
  // Get all documents from a collection
  getCollection: async (collectionName: string) => {
    try {
      // Check if db is initialized
      if (!db) {
        return { success: false, error: 'Database not initialized. Please check your Firebase configuration.' };
      }
      
      // Validate inputs
      if (!collectionName) {
        return { success: false, error: 'Collection name is required' };
      }
      
      const querySnapshot = await db.collection(collectionName).get();
      const documents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
      
      return { success: true, data: documents };
    } catch (error: any) {
      console.error('Error getting collection:', error);
      return { success: false, error: error.message || 'Failed to get collection. Please check your Firebase configuration.' };
    }
  }
};

// Utility function to check initialization status
export function getFirebaseInitializationStatus() {
  return {
    isInitialized,
    initializationError
  };
}

// Export the database instance
export { db };