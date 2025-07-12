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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Destinasyonlar
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Firmalar
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Aktiviteler
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Ayarlar
                  </div>
                </div>
                <Separator />
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleSystemExport} 
                    disabled={isExporting}
                    className="flex-1"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    {isExporting ? "Dışa Aktarılıyor..." : "Sistem Verilerini Dışa Aktar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* İşlemsel Veriler Yedekleme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Database className="mr-2 h-5 w-5 text-green-600" />
                  İşlemsel Veriler
                  <Badge variant="outline" className="ml-2">Kayıtlar & İşlemler</Badge>
                </CardTitle>
                <CardDescription>
                  Rezervasyonlar, cari kayıtlar, finansal işlemler ve diğer operasyonel veriler
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Rezervasyon Listesi
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Rezervasyon Cari
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Tur Satışı
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Tur Müşterileri
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Finansal Girişler
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Borçlar
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Dönem Verileri
                  </div>
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Analiz Kayıtları
                  </div>
                </div>
                <Separator />
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleOperationalExport} 
                    disabled={isExporting}
                    className="flex-1"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    {isExporting ? "Dışa Aktarılıyor..." : "İşlemsel Verileri Dışa Aktar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export Status */}
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
          
          <TabsContent value="restore" className="space-y-4 mt-4">
            <div className="flex flex-col space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Uyarı</AlertTitle>
                <AlertDescription>
                  Geri yükleme işlemi mevcut verilerin üzerine yazacaktır. İşlem öncesi mevcut verilerinizi yedeklemeniz önerilir.
                </AlertDescription>
              </Alert>

              {/* Sistem Verileri Geri Yükleme */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Settings className="mr-2 h-5 w-5 text-blue-600" />
                    Sistem Verilerini Geri Yükle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleSystemImport}
                    disabled={isImporting}
                    className="w-full"
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {isImporting ? "İçe Aktarılıyor..." : "Sistem Verilerini İçe Aktar"}
                  </Button>
                </CardContent>
              </Card>

              {/* İşlemsel Veriler Geri Yükleme */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Database className="mr-2 h-5 w-5 text-green-600" />
                    İşlemsel Verileri Geri Yükle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleOperationalImport}
                    disabled={isImporting}
                    className="w-full"
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {isImporting ? "İçe Aktarılıyor..." : "İşlemsel Verileri İçe Aktar"}
                  </Button>
                </CardContent>
              </Card>

              {/* Import Status */}
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
