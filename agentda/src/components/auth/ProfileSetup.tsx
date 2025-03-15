'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db } from '@/lib/firebase';
import type { User, AccountType } from '@/types';

interface ProfileSetupProps {
  email: string;
  uid: string;
}

export default function ProfileSetup({ email, uid }: ProfileSetupProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    organizationName: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let photoURL = '';
      
      // Upload profile photo if selected
      if (photoFile) {
        const storage = getStorage();
        const photoRef = ref(storage, `profile-photos/${uid}`);
        await uploadBytes(photoRef, photoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      // Update auth profile
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: formData.name,
          photoURL: photoURL || undefined,
        });
      }

      // Create user document
      const userData: Omit<User, 'id'> = {
        email,
        name: formData.name,
        title: formData.title,
        photoURL: photoURL || undefined,
        accountType,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // If organization account, create organization document
      if (accountType === 'organization' && formData.organizationName) {
        const orgRef = doc(db, 'organizations', uid);
        await setDoc(orgRef, {
          name: formData.organizationName,
          ownerId: uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          members: {
            [uid]: {
              role: 'owner' as const,
              joinedAt: Timestamp.now(),
            },
          },
        });
        userData.organizationId = uid;
      }

      // Save user data
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, userData);

      router.push('/dashboard');
    } catch (err) {
      console.error('Error setting up profile:', err);
      setError('Failed to set up profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Complete Your Profile</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-24 h-24 rounded-full bg-gray-200 mb-2 overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg
                  className="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Upload Photo
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Account Type</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAccountType('individual')}
              className={`p-4 border rounded-lg text-center ${
                accountType === 'individual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'hover:border-gray-400'
              }`}
            >
              <div className="font-medium">Individual</div>
              <div className="text-sm text-gray-500">Personal account</div>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('organization')}
              className={`p-4 border rounded-lg text-center ${
                accountType === 'organization'
                  ? 'border-blue-500 bg-blue-50'
                  : 'hover:border-gray-400'
              }`}
            >
              <div className="font-medium">Organization</div>
              <div className="text-sm text-gray-500">Team account</div>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Optional"
          />
        </div>

        {accountType === 'organization' && (
          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium mb-1"
            >
              Organization Name
            </label>
            <input
              type="text"
              id="organizationName"
              value={formData.organizationName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  organizationName: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Complete Setup'}
        </button>
      </form>
    </div>
  );
} 