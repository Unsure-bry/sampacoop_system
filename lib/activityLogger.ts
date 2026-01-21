import { firestore } from './firebase';

// Define types for activity log
export interface ActivityLog {
  id?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  role?: string;
}

/**
 * Logs a user activity to Firestore
 * @param activityLog - The activity log object to save
 */
export async function logActivity(activityLog: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const logData: ActivityLog = {
      ...activityLog,
      timestamp: new Date().toISOString(),
    };

    // Generate a unique ID for the log
    const logId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save to 'activityLogs' collection in Firestore
    const result = await firestore.setDocument('activityLogs', logId, logData);
    
    if (result.success) {
      return { success: true, id: logId };
    } else {
      console.error('Failed to save activity log:', result.error || 'Unknown error');
      return { success: false, error: result.error || 'Failed to save activity log' };
    }
  } catch (error) {
    console.error('Error logging activity:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fetches activity logs for a specific user
 * @param userId - The ID of the user whose logs to fetch
 * @param limit - Maximum number of logs to return (optional)
 */
export async function getUserActivityLogs(userId: string, limit?: number): Promise<{ success: boolean; data?: ActivityLog[]; error?: string }> {
  try {
    let queryFilters = [
      { field: 'userId', operator: '==', value: userId }
    ];
    
    let result;
    if (limit) {
      // Note: The current queryDocuments method doesn't support limit
      // We'll need to sort and limit client-side
      result = await firestore.queryDocuments('activityLogs', queryFilters, { field: 'timestamp', direction: 'desc' });
      if (result.success && result.data) {
        result.data = result.data.slice(0, limit);
      }
    } else {
      result = await firestore.queryDocuments('activityLogs', queryFilters, { field: 'timestamp', direction: 'desc' });
    }
    
    if (result.success && result.data) {
      // Add the document ID to each log
      const logs = result.data.map((doc: any) => ({
        id: doc.id,
        ...doc
      })) as ActivityLog[];
      
      return { success: true, data: logs };
    } else {
      console.error('Failed to fetch activity logs:', result.error || 'No data returned');
      // Return empty array as fallback instead of failing completely
      return { success: true, data: [] };
    }
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    // Return empty array as fallback instead of failing completely
    return { success: true, data: [] };
  }
}

/**
 * Fetches all activity logs (admin function)
 * @param limit - Maximum number of logs to return (optional)
 */
export async function getAllActivityLogs(limit?: number): Promise<{ success: boolean; data?: ActivityLog[]; error?: string }> {
  try {
    // Use queryDocuments to leverage the timestamp index
    let result = await firestore.queryDocuments('activityLogs', [], { field: 'timestamp', direction: 'desc' });
    
    if (result.success && result.data) {
      // Limit the results if specified
      if (limit) {
        result.data = result.data.slice(0, limit);
      }
      
      // Add the document ID to each log
      const logs = result.data.map((doc: any) => ({
        id: doc.id,
        ...doc
      })) as ActivityLog[];
      
      return { success: true, data: logs };
    } else {
      console.error('Failed to fetch all activity logs:', result.error || 'No data returned');
      // Return empty array as fallback instead of failing completely
      return { success: true, data: [] };
    }
  } catch (error) {
    console.error('Error fetching all activity logs:', error);
    // Return empty array as fallback instead of failing completely
    return { success: true, data: [] };
  }
}

/**
 * Fetches activity logs for a specific date range
 * @param userId - The ID of the user whose logs to fetch (optional - if not provided, fetches all logs)
 * @param startDate - Start date for the range
 * @param endDate - End date for the range
 */
export async function getActivityLogsByDateRange(
  userId: string | null,
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; data?: ActivityLog[]; error?: string }> {
  try {
    let queryFilters = [];
    
    if (userId) {
      queryFilters.push({ field: 'userId', operator: '==', value: userId });
    }
    
    queryFilters.push(
      { field: 'timestamp', operator: '>=', value: startDate.toISOString() },
      { field: 'timestamp', operator: '<=', value: endDate.toISOString() }
    );
    
    // Query with filters and sort by timestamp descending, leveraging the indexes
    const result = await firestore.queryDocuments('activityLogs', queryFilters, { field: 'timestamp', direction: 'desc' });
    
    if (result.success && result.data) {
      // Add the document ID to each log
      const logs = result.data.map((doc: any) => ({
        id: doc.id,
        ...doc
      })) as ActivityLog[];
      
      return { success: true, data: logs };
    } else {
      console.error('Failed to fetch activity logs by date range:', result.error || 'No data returned');
      // Return empty array as fallback instead of failing completely
      return { success: true, data: [] };
    }
  } catch (error) {
    console.error('Error fetching activity logs by date range:', error);
    return { success: false, error: (error as Error).message };
  }
}