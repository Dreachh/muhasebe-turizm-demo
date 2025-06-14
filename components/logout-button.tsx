'use client';

import { Button } from "@/components/ui/button";
import { LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/firebase-auth";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className }: { className?: string }) {
  const auth = useAuth();
  const user = auth.user;
  const logout = auth.signout; // Büyük/küçük harf değişikliği
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await logout();
      
      // Cookie ve localStorage'dan oturum bilgilerini temizle
      document.cookie = 'firebase_session=; path=/; max-age=0; SameSite=Strict';
      document.cookie = 'admin_logged_in=; path=/; max-age=0; SameSite=Strict';
      localStorage.removeItem('adminLoggedIn');
      
      // Login sayfasına yönlendir
      router.push('/login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  };
  
  return (
    <div className={`flex items-center gap-4 ${className || ''}`}>
      {user && (
        <div className="flex items-center">
          <UserCircle className="h-5 w-5 mr-2 text-gray-600" />
          <span className="text-sm font-medium mr-4 hidden sm:inline-block">
            {user.email}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline-block">Çıkış Yap</span>
          </Button>
        </div>
      )}
    </div>
  );
}
