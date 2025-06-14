"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { getAuth, onAuthStateChanged, User } from "firebase/auth" // User tipini import et
import { app as firebaseApp } from "@/lib/firebase"
import { AdminHeader } from "@/components/admin-header" // Düzeltilmiş import
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  DollarSign,
  ShoppingCart,
  Settings,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Filter,
  Upload,
  PlusCircle,
  FileText,
  LineChart
} from "lucide-react" // Kullanılan ikonlar
// import { checkUserRole } from "@/lib/auth-utils" // Kullanılmıyor
// import { UserRole } from "@/types/user" // Kullanılmıyor
import { useToast } from "@/components/ui/use-toast"

interface RecentActivity {
  id: string
  description: string
  timestamp: string
  user: string
  type: "sale" | "customer" | "expense" | "setting_change"
}

const initialRecentActivities: RecentActivity[] = [ // initial olarak adlandırdık
  { id: "1", description: "Yeni tur satışı yapıldı: Paris Gezisi", timestamp: "10 dakika önce", user: "Ahmet Y.", type: "sale" },
  { id: "2", description: "Müşteri eklendi: Ayşe K.", timestamp: "1 saat önce", user: "Admin", type: "customer" },
  { id: "3", description: "Gider eklendi: Ofis Kirası", timestamp: "3 saat önce", user: "Muhasebe", type: "expense" },
  { id: "4", description: "Kur ayarları güncellendi", timestamp: "Dün", user: "Admin", type: "setting_change" },
]

interface AdminNotification {
  id: string
  title: string
  message: string
  read: boolean
  type: "info" | "warning" | "error"
}

const initialNotifications: AdminNotification[] = [ // initial olarak adlandırdık
  { id: "1", title: "Yeni Güncelleme Mevcut", message: "Sistem sürümü 2.5.0'a güncellendi.", read: false, type: "info" },
  { id: "2", title: "Veritabanı Bakımı", message: "Bu gece 02:00'de veritabanı bakımı yapılacaktır.", read: true, type: "warning" },
  { id: "3", title: "Ödeme Hatası", message: "Müşteri #1234 için ödeme alınamadı.", read: false, type: "error" },
]

// Firebase Auth örneğini al
const auth = getAuth(firebaseApp);

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null) // Firebase kullanıcı durumu User tipi ile güncellendi
  const [notifications, setNotifications] = useState<AdminNotification[]>(initialNotifications) // notifications state'e dönüştürüldü
  const [recentActivities] = useState<RecentActivity[]>(initialRecentActivities); // recentActivities state'e dönüştürüldü (şimdilik sadece okunuyor)
  const { toast } = useToast();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        // Kullanıcı giriş yaptıktan sonra, admin olup olmadığını kontrol et
        const isAdmin = user.email === "admin@arzum.com"; // Basit bir email kontrolü ile admin belirleme
        setIsAdmin(isAdmin);
        
        if (!isAdmin) {
          // Admin değilse, anasayfaya yönlendir
          router.push("/");
        } else {
          // Admin ise, dashboard'ı yükle
          setLoading(false);
        }
      } else {
        // Kullanıcı giriş yapmadıysa, giriş sayfasına yönlendir
        router.push("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [router, session, status]) // Bağımlılıklara router, session ve status eklendi

  // NextAuth session kontrolü
  useEffect(() => {
    if (status === "loading") {
      return; // Session yükleniyorsa hiçbir şey yapma
    }

    if (session) {
      // Oturum açılmışsa, kullanıcı bilgilerini al
      const { user } = session;

      // Kullanıcı rolünü kontrol et (örneğin, admin olup olmadığını)
      // Bu örnekte, sadece email kontrolü yapıyoruz
      const isAdmin = user?.email === "admin@arzum.com";

      setIsAdmin(isAdmin);

      if (!isAdmin) {
        // Admin değilse, anasayfaya yönlendir
        router.push("/");
      } else {
        // Admin ise, dashboard'ı yükle
        setLoading(false);
      }
    } else {
      // Oturum açılmamışsa, giriş sayfasına yönlendir
      router.push("/admin/login");
    }
  }, [session, status, firebaseUser, router])


  const handleSignOut = async () => {
    await signOut();
    router.push("/admin/login");
  }

  if (loading || status === "loading" || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Yükleniyor...</h1>
          <p>Lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Admin değilse hiçbir şey render etme
  }


  // Admin ise dashboard'ı göster
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AdminHeader />

      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>

          <Tabs defaultValue="overview">
            <div className="flex items-center">
              <TabsList>
                <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
                <TabsTrigger value="analytics">Analitik</TabsTrigger>
                <TabsTrigger value="reports">Raporlar</TabsTrigger>
                <TabsTrigger value="notifications">Bildirimler ({notifications.filter(n => !n.read).length})</TabsTrigger>
              </TabsList>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filtrele
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1">
                  <Upload className="h-3.5 w-3.5" />
                  Yükle
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Yeni Oluştur
                </Button>
              </div>
            </div>
            <TabsContent value="overview">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Genel Bakış</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg shadow">
                      <div className="flex items-center">
                        <div className="text-green-500 mr-4">
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Toplam Gelir</p>
                          <p className="text-lg font-bold">₺12,345</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg shadow">
                      <div className="flex items-center">
                        <div className="text-blue-500 mr-4">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Toplam Müşteri</p>
                          <p className="text-lg font-bold">1,234</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg shadow">
                      <div className="flex items-center">
                        <div className="text-yellow-500 mr-4">
                          <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Toplam Satış</p>
                          <p className="text-lg font-bold">567</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg shadow">
                      <div className="flex items-center">
                        <div className="text-red-500 mr-4">
                          <XCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Hata Bildirimi</p>
                          <p className="text-lg font-bold">3</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Son Aktiviteler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentActivities.map(activity => (
                      <div key={activity.id} className="p-4 bg-white rounded-lg shadow">
                        <div className="flex items-center">
                          <div className="text-gray-500 mr-4">
                            <LineChart className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-gray-400">{activity.timestamp} - {activity.user}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Analitik Veriler</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Analitik veriler burada gösterilecek.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="reports">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Raporlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Raporlar burada gösterilecek.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="notifications">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Bildirimler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notifications.map(notification => (
                      <div key={notification.id} className={`p-4 rounded-lg shadow ${notification.read ? "bg-gray-50" : "bg-white"} flex items-center`}>
                        <div className={`text-white rounded-full h-10 w-10 flex items-center justify-center mr-4 ${notification.type === "info" ? "bg-blue-500" : notification.type === "warning" ? "bg-yellow-500" : "bg-red-500"}`}>
                          {notification.type === "info" && <Info className="h-5 w-5" />}
                          {notification.type === "warning" && <AlertTriangle className="h-5 w-5" />}
                          {notification.type === "error" && <XCircle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-gray-400">{notification.message}</p>
                        </div>
                        <Button variant="link" size="sm" onClick={() => {
                          // Bildirimi okundu olarak işaretle (state'i güncelle)
                          const updatedNotifications = notifications.map(n => n.id === notification.id ? {...n, read: true} : n);
                          setNotifications(updatedNotifications); // State'i güncelle
                          toast({ title: "Bildirim okundu.", description: notification.title });
                        }}>
                          Okundu İşaretle
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}