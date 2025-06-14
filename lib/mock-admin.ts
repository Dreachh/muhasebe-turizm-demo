// Admin kimlik bilgilerini test amaçlı sağlayan mock servis
// Firebase izin sorunlarını geçici olarak bypass etmek için kullanılır

// Sabit admin kimlik bilgileri
const mockAdminCredentials = {
  username: "admin",
  password: "Passionis123", 
  email: "passionistravell@gmail.com",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Yerel Admin kimlik bilgilerini alır
 * @returns Admin kullanıcı bilgileri
 */
export async function getMockAdminCredentials() {
  return mockAdminCredentials;
}

/**
 * Admin kullanıcı adını günceller (mock)
 * @param newUsername Yeni kullanıcı adı 
 */
export async function updateMockAdminUsername(newUsername: string) {
  try {
    console.log(`[MOCK] Admin kullanıcı adı güncellendi: ${newUsername}`);
    return { success: true };
  } catch (error) {
    console.error("Mock admin kullanıcı adı güncelleme hatası:", error);
    return { success: false, error };
  }
}

/**
 * Admin şifresini günceller (mock)
 * @param newPassword Yeni şifre
 */
export async function updateMockAdminPassword(newPassword: string) {
  try {
    console.log("[MOCK] Admin şifresi güncellendi");
    return { success: true };
  } catch (error) {
    console.error("Mock admin şifre güncelleme hatası:", error);
    return { success: false, error };
  }
}
