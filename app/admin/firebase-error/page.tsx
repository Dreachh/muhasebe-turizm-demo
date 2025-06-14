'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { Info, RefreshCw, ArrowLeft } from 'lucide-react';

export default function FirebaseErrorPage() {
  const router = useRouter();

  const handleRetry = () => {
    // Sayfayı yenile
    window.location.reload();
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-6 w-6 text-orange-500" /> 
            Firebase Bağlantı Hatası
          </CardTitle>
          <CardDescription>
            Firebase veritabanına bağlanırken bir sorun oluştu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Bağlantı kurulamadı</AlertTitle>
            <AlertDescription>
              Firebase veritabanına bağlanırken bir hata oluştu. 
              Bu durum geçici bir ağ sorunundan veya tarayıcı önbellek sorunlarından kaynaklanıyor olabilir.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Şunları deneyebilirsiniz:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Sayfayı yenileyin</li>
              <li>Tarayıcı önbelleğini temizleyin</li>
              <li>İnternet bağlantınızı kontrol edin</li>
              <li>Tarayıcıda gizli modu kullanmayı deneyin</li>
              <li>Farklı bir tarayıcı ile deneme yapın</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Button>
          <Button onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Yeniden Dene
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
