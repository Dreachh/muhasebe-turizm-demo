"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Check, Settings, Database, FileDown, FileUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { exportSystemData, importSystemData, exportOperationalData, importOperationalData } from "../lib/enhanced-export-import";

export interface BackupRestoreProps {
  onComplete?: () => void;
}

export function BackupRestore({ onComplete }: BackupRestoreProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");

  // Sistem verilerini dışa aktar (Ayarlar, Destinasyonlar, Firmalar vb.)
  const handleSystemExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus("Sistem verileri dışa aktarılıyor...");
      await exportSystemData();
      setExportStatus("Sistem verileri başarıyla dışa aktarıldı!");
      toast({
        title: "Başarılı",
        description: "Sistem verileri başarıyla dışa aktarıldı.",
      });
    } catch (error) {
      console.error("Sistem verisi dışa aktarma hatası:", error);
      setExportStatus("Sistem verisi dışa aktarma sırasında bir hata oluştu!");
      toast({
        title: "Hata",
        description: "Sistem verisi dışa aktarma sırasında bir hata oluştu!",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // İşlemsel verileri dışa aktar (Rezervasyonlar, Cari, Finansal kayıtlar vb.)
  const handleOperationalExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus("İşlemsel veriler dışa aktarılıyor...");
      await exportOperationalData();
      setExportStatus("İşlemsel veriler başarıyla dışa aktarıldı!");
      toast({
        title: "Başarılı",
        description: "İşlemsel veriler başarıyla dışa aktarıldı.",
      });
    } catch (error) {
      console.error("İşlemsel veri dışa aktarma hatası:", error);
      setExportStatus("İşlemsel veri dışa aktarma sırasında bir hata oluştu!");
      toast({
        title: "Hata",
        description: "İşlemsel veri dışa aktarma sırasında bir hata oluştu!",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Genel import handler
  const handleImport = () => {
    // Kullanıcının hangi veri türünü import etmek istediğini seçmesi için
    // Import fonksiyonları kendi dosya seçicilerini içeriyor
  };

  // Sistem verilerini içe aktar
  const handleSystemImport = async () => {
    try {
      setIsImporting(true);
      setImportStatus("Sistem verileri içe aktarılıyor...");
      await importSystemData();
      setImportStatus("Sistem verileri başarıyla içe aktarıldı!");
      toast({
        title: "Başarılı",
        description: "Sistem verileri başarıyla içe aktarıldı.",
      });
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Sistem verisi içe aktarma hatası:", error);
      setImportStatus("Sistem verisi içe aktarma sırasında bir hata oluştu!");
      toast({
        title: "Hata",
        description: "Sistem verisi içe aktarma sırasında bir hata oluştu!",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // İşlemsel verileri içe aktar
  const handleOperationalImport = async () => {
    try {
      setIsImporting(true);
      setImportStatus("İşlemsel veriler içe aktarılıyor...");
      await importOperationalData();
      setImportStatus("İşlemsel veriler başarıyla içe aktarıldı!");
      toast({
        title: "Başarılı",
        description: "İşlemsel veriler başarıyla içe aktarıldı.",
      });
      if (onComplete) onComplete();
    } catch (error) {
      console.error("İşlemsel veri içe aktarma hatası:", error);
      setImportStatus("İşlemsel veri içe aktarma sırasında bir hata oluştu!");
      toast({
        title: "Hata",
        description: "İşlemsel veri içe aktarma sırasında bir hata oluştu!",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };
    try {
      setIsImporting(true);
      setImportStatus("Sistem verileri içe aktarılıyor...");
      await importSystemData();
      setImportStatus("Sistem verileri başarıyla içe aktarıldı!");
      toast({
        title: "Başarılı",
        description: "Sistem verileri başarıyla içe aktarıldı.",
      });
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Sistem verisi içe aktarma hatası:", error);
      setImportStatus("Sistem verisi içe aktarma sırasında bir hata oluştu!");
      toast({
        title: "Hata",
        description: "Sistem verisi içe aktarma sırasında bir hata oluştu!",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // İşlemsel verileri içe aktar
  const handleOperationalImport = async () => {
    try {
      setIsImporting(true);
      setImportStatus("İşlemsel veriler içe aktarılıyor...");
      await importOperationalData();
      setImportStatus("İşlemsel veriler başarıyla içe aktarıldı!");
      toast({
        title: "Başarılı",
        description: "İşlemsel veriler başarıyla içe aktarıldı.",
      });
      if (onComplete) onComplete();
    } catch (error) {
      console.error("İşlemsel veri içe aktarma hatası:", error);
      setImportStatus("İşlemsel veri içe aktarma sırasında bir hata oluştu!");
      toast({
        title: "Hata",
        description: "İşlemsel veri içe aktarma sırasında bir hata oluştu!",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-[700px] max-w-full">
      <CardHeader>
        <CardTitle>Gelişmiş Veri Yedekleme ve Geri Yükleme</CardTitle>
        <CardDescription>
          Verilerinizi kategorilere ayırarak yedekleyin ve geri yükleyin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="backup">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backup">Yedekleme</TabsTrigger>
            <TabsTrigger value="restore">Geri Yükleme</TabsTrigger>
          </TabsList>
          
          <TabsContent value="backup" className="space-y-6 mt-4">
            {/* Sistem Verileri Yedekleme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Settings className="mr-2 h-5 w-5 text-blue-600" />
                  Sistem Verileri
                  <Badge variant="outline" className="ml-2">Ayarlar & Tanımlar</Badge>
                </CardTitle>
                <CardDescription>
                  Program ayarları, destinasyonlar, firmalar, aktiviteler ve diğer sistem tanımları
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p><strong>İçerik:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Destinasyonlar</li>
                    <li>Firmalar & Acenteler</li>
                    <li>Aktiviteler</li>
                    <li>Gider Türleri</li>
                    <li>Program Ayarları</li>
                    <li>Şirket Bilgileri</li>
                  </ul>
                </div>
                <Button 
                  onClick={handleSystemExport} 
                  disabled={isExporting} 
                  className="w-full"
                  variant="outline"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  {isExporting ? "Sistem Verileri Yedekleniyor..." : "Sistem Verilerini Yedekle"}
                </Button>
              </CardContent>
            </Card>

            <Separator />

            {/* İşlemsel Veriler Yedekleme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Database className="mr-2 h-5 w-5 text-green-600" />
                  İşlemsel Veriler
                  <Badge variant="outline" className="ml-2">Kayıtlar & İşlemler</Badge>
                </CardTitle>
                <CardDescription>
                  Rezervasyonlar, cari hesaplar, finansal kayıtlar ve diğer işlemsel veriler
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p><strong>İçerik:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Rezervasyon Listesi</li>
                    <li>Rezervasyon Cari Hesapları</li>
                    <li>Tur Satışları</li>
                    <li>Müşteri Kayıtları</li>
                    <li>Finansal Giriş Kayıtları</li>
                    <li>Borç Kayıtları</li>
                    <li>Dönem Verileri</li>
                  </ul>
                </div>
                <Button 
                  onClick={handleOperationalExport} 
                  disabled={isExporting} 
                  className="w-full"
                  variant="outline"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  {isExporting ? "İşlemsel Veriler Yedekleniyor..." : "İşlemsel Verileri Yedekle"}
                </Button>
              </CardContent>
            </Card>
            
            {exportStatus && (
              <Alert className={exportStatus.includes("hata") ? "bg-red-50" : "bg-green-50"}>
                {exportStatus.includes("hata") ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <AlertTitle>Durum</AlertTitle>
                <AlertDescription>{exportStatus}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="restore" className="space-y-6 mt-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-600">Dikkat</AlertTitle>
              <AlertDescription className="text-amber-700">
                Bu işlemler mevcut verilerinizin üzerine yazacaktır. İşlem geri alınamaz.
              </AlertDescription>
            </Alert>

            {/* Sistem Verileri Geri Yükleme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Settings className="mr-2 h-5 w-5 text-blue-600" />
                  Sistem Verilerini Geri Yükle
                </CardTitle>
                <CardDescription>
                  Sistem ayarları ve tanımlarını geri yükleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleSystemImport} 
                  disabled={isImporting} 
                  className="w-full"
                  variant="outline"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {isImporting ? "Sistem Verileri Yükleniyor..." : "Sistem Yedek Dosyasını Seç"}
                </Button>
              </CardContent>
            </Card>

            <Separator />

            {/* İşlemsel Veriler Geri Yükleme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Database className="mr-2 h-5 w-5 text-green-600" />
                  İşlemsel Verileri Geri Yükle
                </CardTitle>
                <CardDescription>
                  Rezervasyonlar ve işlemsel kayıtları geri yükleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleOperationalImport} 
                  disabled={isImporting} 
                  className="w-full"
                  variant="outline"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {isImporting ? "İşlemsel Veriler Yükleniyor..." : "İşlemsel Yedek Dosyasını Seç"}
                </Button>
              </CardContent>
            </Card>
            
            {importStatus && (
              <Alert className={importStatus.includes("hata") ? "bg-red-50" : "bg-green-50"}>
                {importStatus.includes("hata") ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <AlertTitle>Durum</AlertTitle>
                <AlertDescription>{importStatus}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onComplete}>
          İptal
        </Button>
      </CardFooter>
    </Card>
  );
}
              
              {exportStatus && (
                <Alert className={exportStatus.includes("hata") ? "bg-red-50" : "bg-green-50"}>
                  {exportStatus.includes("hata") ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <AlertTitle>Durum</AlertTitle>
                  <AlertDescription>{exportStatus}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="restore" className="space-y-4 mt-4">
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground">
                Önceden aldığınız bir yedeği sisteme geri yükleyin. Mevcut verileriniz üzerine yazılacaktır.
              </p>
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-600">Dikkat</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Bu işlem mevcut verilerinizin üzerine yazacaktır. İşlem geri alınamaz.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleImport} 
                disabled={isImporting} 
                className="w-full"
                variant="outline"
              >
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                {isImporting ? "İçe Aktarılıyor..." : "Yedek Dosyasını Yükle"}
              </Button>
              
              {importStatus && (
                <Alert className={importStatus.includes("hata") ? "bg-red-50" : "bg-green-50"}>
                  {importStatus.includes("hata") ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <AlertTitle>Durum</AlertTitle>
                  <AlertDescription>{importStatus}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onComplete}>
          İptal
        </Button>
      </CardFooter>
    </Card>
  );
}

// Ana sayfa için BackupRestoreView bileşeni
export function BackupRestoreView({ 
  onClose, 
  onExport, 
  onImport 
}: {
  onClose: () => void;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
}) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Veri Yedekleme ve Geri Yükleme</h2>
        <Button variant="ghost" onClick={onClose}>Kapat</Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Veri Yedekleme ve Geri Yükleme</CardTitle>
          <CardDescription>Verilerinizi yedekleyebilir ve geri yükleyebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Button 
              className="flex-1" 
              onClick={onExport} 
              variant="outline"
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Verileri Dışa Aktar
            </Button>
            <Button 
              className="flex-1" 
              onClick={onImport}
              variant="outline"
            >
              <ArrowUpFromLine className="mr-2 h-4 w-4" /> Verileri İçe Aktar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

