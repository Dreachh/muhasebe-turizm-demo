"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { exportData, importData } from "@/lib/export-import";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export interface BackupRestoreProps {
  onComplete?: () => void;
}

export function BackupRestore({ onComplete }: BackupRestoreProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");

  // LocalStorage yedekleme işlemi (mevcut yöntem)
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus("Veriler dışa aktarılıyor...");
      await exportData();
      setExportStatus("Veriler başarıyla dışa aktarıldı!");
      toast({
        title: "Başarılı",
        description: "Veriler başarıyla dışa aktarıldı.",
      });
    } catch (error) {
      console.error("Dışa aktarma hatası:", error);
      setExportStatus("Dışa aktarma sırasında bir hata oluştu!");
      toast({
        title: "Hata",
        description: "Dışa aktarma sırasında bir hata oluştu!",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // LocalStorage içe aktarma işlemi (mevcut yöntem)
  const handleImport = async () => {
    try {
      setIsImporting(true);
      setImportStatus("Veriler içe aktarılıyor...");
      await importData();
      setImportStatus("Veriler başarıyla içe aktarıldı!");
      toast({
        title: "Başarılı",
        description: "Veriler başarıyla içe aktarıldı.",
      });
      if (onComplete) onComplete();
    } catch (error) {
      console.error("İçe aktarma hatası:", error);
      setImportStatus("İçe aktarma sırasında bir hata oluştu!");
      toast({
        title: "Hata",
        description: "İçe aktarma sırasında bir hata oluştu!",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-[600px] max-w-full">
      <CardHeader>
        <CardTitle>Veri Yedekleme ve Taşıma</CardTitle>
        <CardDescription>
          Verilerinizi yedekleyin ve geri yükleyin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="backup">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backup">Yedekleme</TabsTrigger>
            <TabsTrigger value="restore">Geri Yükleme</TabsTrigger>
          </TabsList>
          
          <TabsContent value="backup" className="space-y-4 mt-4">
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground">
                Mevcut verilerinizin bir yedeğini alın. Yedek dosyası daha sonra geri yüklenebilir.
              </p>
              
              <Button 
                onClick={handleExport} 
                disabled={isExporting} 
                className="w-full"
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                {isExporting ? "Yedekleniyor..." : "Yedekle"}
              </Button>
              
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

