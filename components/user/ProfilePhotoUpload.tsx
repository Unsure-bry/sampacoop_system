'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface ProfilePhotoUploadProps {
  onPhotoUpdate?: () => void;
}

export default function ProfilePhotoUpload({ onPhotoUpdate }: ProfilePhotoUploadProps) {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current photo on component mount
  useEffect(() => {
    if (user?.uid) {
      fetchCurrentPhoto();
    }
  }, [user]);

  const fetchCurrentPhoto = async () => {
    try {
      const result = await firestore.getDocument('users', user?.uid || '');
      if (result.success && result.data) {
        const userData = result.data as any;
        if (userData.photoURL) {
          setCurrentPhotoUrl(userData.photoURL);
          setPreviewUrl(userData.photoURL);
        }
      }
    } catch (error) {
      console.error('Error fetching current photo:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to storage (this is a simplified implementation)
    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    if (!user?.uid) {
      toast.error('User not authenticated');
      return;
    }

    setIsUploading(true);

    try {
      // In a real implementation, you would upload to Firebase Storage
      // For now, we'll simulate the upload with a base64 encoding
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        // Update user document with photo URL
        const result = await firestore.updateDocument('users', user.uid, {
          photoURL: base64Data,
          updatedAt: new Date().toISOString()
        });

        if (result.success) {
          toast.success('Profile photo updated successfully!');
          setCurrentPhotoUrl(base64Data);
          if (onPhotoUpdate) {
            onPhotoUpdate();
          }
        } else {
          throw new Error('Failed to update photo in database');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload profile photo');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const getDisplayPhoto = () => {
    return previewUrl || currentPhotoUrl || undefined;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-red-100 flex items-center justify-center mb-4">
          {getDisplayPhoto() ? (
            <img 
              src={getDisplayPhoto()} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        <button
          onClick={triggerFileSelect}
          className="absolute bottom-0 right-0 bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          title="Change Photo"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />
      
      <button 
        onClick={triggerFileSelect}
        className="text-red-600 hover:text-red-800 text-sm font-medium"
      >
        {isUploading ? 'Uploading...' : 'Change Photo'}
      </button>
      
      {isUploading && (
        <div className="mt-2">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600"></div>
        </div>
      )}
    </div>
  );
}