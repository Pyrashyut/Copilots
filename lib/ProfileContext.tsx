// lib/ProfileContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface ProfileContextType {
  profilePhotoUrl: string | null;
  setProfilePhotoUrl: (url: string | null) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profilePhotoUrl: null,
  setProfilePhotoUrl: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  return (
    <ProfileContext.Provider value={{ profilePhotoUrl, setProfilePhotoUrl }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfilePhoto = () => useContext(ProfileContext);
