import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';

// Desteklenen diller
export const locales = ['en', 'tr'];
export const defaultLocale = 'tr'; // Varsayılan dil

export default getRequestConfig(async ({locale}) => {
  // Sağlanan locale'in geçerli olup olmadığını daha güvenli kontrol et
  let baseLocale = defaultLocale; // Varsayılan ile başla
  if (locale && locales.includes(locale)) { // locale tanımlı ve destekleniyorsa kullan
    baseLocale = locale;
  }
  // Artık baseLocale kesinlikle geçerli bir string

  // Mesajları yükle, hata durumunda 404 sayfasına yönlendir
  let messages;
  try {
    messages = (await import(`./messages/${baseLocale}.json`)).default;
  } catch (error) {
    notFound(); // Dil dosyası bulunamazsa 404
  }

  return {
    locale: baseLocale, // baseLocale artık kesinlikle string
    messages
  };
});
