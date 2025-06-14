"use client";

interface SessionProviderProps {
  children: React.ReactNode;
}

// Named export olarak tanımla
export function SessionProvider({ children }: SessionProviderProps) {
  return <>{children}</>;
}

// Geriye dönük uyumluluk için default export'u koru
export default SessionProvider;