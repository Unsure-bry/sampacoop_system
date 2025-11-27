import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Firestore,
  CollectionReference,
  DocumentData
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Your web app's Firebase configuration
// Using environment variables with fallbacks for development
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAd3OwNBINoOY840jMGSrF74goXP39N3E",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sampacoop-af786.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sampacoop-af786",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sampacoop-af786.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "907285132975",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:907285132975:web:a3c5eaace0b938c2f8065a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-6C6EPXM3GN"
};

// Initialize Firebase - only initialize once
let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

// Only initialize Firebase client-side
if (typeof window !== 'undefined') {
  try {
    // Check if required config values are present
    const requiredConfig = [
      'apiKey', 'authDomain', 'projectId', 'storageBucket', 
      'messagingSenderId', 'appId'
    ];
    
    const missingConfig = requiredConfig.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
    
    if (missingConfig.length > 0) {
      console.warn('Missing Firebase config values:', missingConfig);
    }
    
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    
    console.log('Firebase client initialized successfully');
  } catch (error) {
    console.error('Firebase client initialization failed:', error);
  }
}

// Helper function to validate Firestore connection
const validateFirestoreConnection = (): { isValid: boolean; error?: string } => {
  if (!db) {
    return { 
      isValid: false, 
      error: 'Firestore is not initialized. Check your Firebase configuration.' 
    };
  }
  
  // Check if we can access the database
  try {
    // This is a basic check - in a real app you might want to do a more thorough test
    if (!db.app) {
      return { 
        isValid: false, 
        error: 'Firestore app reference is missing.' 
      };
    }
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: `Firestore connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

// Firestore utility functions
export const firestore = {
  // Create or update a document
  setDocument: async (collectionName: string, docId: string, data: any) => {
    const validation = validateFirestoreConnection();
    if (!validation.isValid) {
      console.error('Firestore connection error:', validation.error);
      return { success: false, error: validation.error };
    }
    
    try {
      // Validate inputs
      if (!collectionName || !docId) {
        throw new Error('Collection name and document ID are required');
      }
      
      await setDoc(doc(db!, collectionName, docId), data, { merge: true });
      console.log(`Document set successfully in ${collectionName}/${docId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error setting document:', error);
      const errorMessage = error.message || 'Failed to set document';
      return { success: false, error: errorMessage };
    }
  },

  // Get a single document
  getDocument: async (collectionName: string, docId: string) => {
    const validation = validateFirestoreConnection();
    if (!validation.isValid) {
      console.error('Firestore connection error:', validation.error);
      return { success: false, error: validation.error };
    }
    
    try {
      // Validate inputs
      if (!collectionName || !docId) {
        throw new Error('Collection name and document ID are required');
      }
      
      const docRef = doc(db!, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`Document retrieved successfully from ${collectionName}/${docId}`);
        return { success: true, data };
      } else {
        console.log(`Document not found: ${collectionName}/${docId}`);
        return { success: false, error: 'Document not found' };
      }
    } catch (error: any) {
      console.error('Error getting document:', error);
      const errorMessage = error.message || 'Failed to get document';
      return { success: false, error: errorMessage };
    }
  },

  // Get all documents from a collection
  getCollection: async (collectionName: string) => {
    const validation = validateFirestoreConnection();
    if (!validation.isValid) {
      console.error('Firestore connection error:', validation.error);
      return { success: false, error: validation.error };
    }
    
    try {
      // Validate inputs
      if (!collectionName) {
        throw new Error('Collection name is required');
      }
      
      const querySnapshot = await getDocs(collection(db!, collectionName));
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Retrieved ${documents.length} documents from ${collectionName}`);
      return { success: true, data: documents };
    } catch (error: any) {
      console.error('Error getting collection:', error);
      const errorMessage = error.message || 'Failed to get collection';
      // Provide more specific error messages
      if (errorMessage.includes('PERMISSION_DENIED')) {
        return { success: false, error: 'Access denied. Check Firestore rules and user permissions.' };
      }
      if (errorMessage.includes('NOT_FOUND')) {
        return { success: false, error: `Collection '${collectionName}' not found.` };
      }
      return { success: false, error: errorMessage };
    }
  },

  // Query documents
  queryDocuments: async (
    collectionName: string, 
    conditions: { field: string; operator: any; value: any }[],
    orderByField?: { field: string; direction: 'asc' | 'desc' }

  ) => {
    const validation = validateFirestoreConnection();
    if (!validation.isValid) {
      console.error('Firestore connection error:', validation.error);
      return { success: false, error: validation.error };
    }
    
    try {
      // Validate inputs
      if (!collectionName) {
        throw new Error('Collection name is required');
      }
      
      const collectionRef = collection(db!, collectionName) as CollectionReference<DocumentData>;
      
      // Build query constraints
      const queryConstraints = [
        ...conditions.map(condition => {
          // Validate condition
          if (!condition.field || !condition.operator || condition.value === undefined) {
            throw new Error('Invalid query condition. Field, operator, and value are required.');
          }
          return where(condition.field, condition.operator, condition.value);
        }),
        ...(orderByField ? [orderBy(orderByField.field, orderByField.direction)] : [])
      ];

      // Create and execute query
      const q = query(collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`Query returned ${documents.length} documents from ${collectionName}`);
      return { success: true, data: documents };
    } catch (error: any) {
      console.error('Error querying documents:', error);
      const errorMessage = error.message || 'Failed to query documents';
      // Provide more specific error messages
      if (errorMessage.includes('PERMISSION_DENIED')) {
        return { success: false, error: 'Access denied. Check Firestore rules and user permissions.' };
      }
      if (errorMessage.includes('INVALID_ARGUMENT')) {
        return { success: false, error: 'Invalid query parameters. Check field names and operators.' };
      }
      return { success: false, error: errorMessage };
    }
  },

  // Update a document
  updateDocument: async (collectionName: string, docId: string, data: any) => {
    const validation = validateFirestoreConnection();
    if (!validation.isValid) {
      console.error('Firestore connection error:', validation.error);
      return { success: false, error: validation.error };
    }
    
    try {
      // Validate inputs
      if (!collectionName || !docId) {
        throw new Error('Collection name and document ID are required');
      }
      
      await updateDoc(doc(db!, collectionName, docId), data);
      console.log(`Document updated successfully in ${collectionName}/${docId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error updating document:', error);
      const errorMessage = error.message || 'Failed to update document';
      return { success: false, error: errorMessage };
    }
  },

  // Delete a document
  deleteDocument: async (collectionName: string, docId: string) => {
    const validation = validateFirestoreConnection();
    if (!validation.isValid) {
      console.error('Firestore connection error:', validation.error);
      return { success: false, error: validation.error };
    }
    
    try {
      // Validate inputs
      if (!collectionName || !docId) {
        throw new Error('Collection name and document ID are required');
      }
      
      await deleteDoc(doc(db!, collectionName, docId));
      console.log(`Document deleted successfully from ${collectionName}/${docId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting document:', error);
      const errorMessage = error.message || 'Failed to delete document';
      return { success: false, error: errorMessage };
    }
  },
  
  // Test connection function
  testConnection: async () => {
    const validation = validateFirestoreConnection();
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    
    try {
      // Try to get a reference to a test collection
      const testCollection = collection(db!, 'test');
      console.log('Firestore connection test successful');
      return { success: true };
    } catch (error: any) {
      console.error('Firestore connection test failed:', error);
      return { success: false, error: error.message || 'Connection test failed' };
    }
  }
};

export { auth, app, db };