"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarIcon, 
  Clock, 
  Users, 
  MapPin, 
  ExternalLink 
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Para formatı yardımcı fonksiyonu
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: currency || 'TRY' 
  }).format(amount);
}

// Event (Tour) tipini tanımla (daha spesifik)
interface CalendarEvent {
  id: string | number;
  date: Date;
  title: string;
  customers: number | string; // Tur verisinden gelen katılımcı sayısı veya müşteri adı olabilir
  color?: string;
  location?: string;
  time?: string;
  // Ek detaylar (tur verisinden)
  tourName?: string;
  customerName?: string;
  totalPrice?: number;
  currency?: string;
  serialNumber?: string;
}

// Props tipi
interface CalendarViewProps {
  onNavigate: (viewId: string, params?: any) => void; // Opsiyonel parametre eklendi
  // onViewTour kaldırıldı, detaylar modal içinde gösterilecek
  toursData: CalendarEvent[]; // Gelen veri tipini belirle
}

export function CalendarView({ onNavigate, toursData = [] }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState("month")
  const [manualDate, setManualDate] = useState("")

  // Modal state'leri
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ]

  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
  const fullDayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7)
    } else if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7)
    } else if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleManualDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualDate(e.target.value)
  }

  const handleManualDateSubmit = () => {
    if (manualDate) {
      const newDate = new Date(manualDate + 'T00:00:00') // ISO format'ında parse et
      if (!isNaN(newDate.getTime())) {
        setCurrentDate(newDate)
        setManualDate("")
      }
    }
  }

  const handleManualDateKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleManualDateSubmit()
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Ayın ilk gününü ve toplam gün sayısını hesapla
  const getMonthDetails = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Haftanın ilk günü Pazartesi (1) olacak şekilde ayarla
    const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

    return { firstDayIndex, daysInMonth, year, month }
  }

  // Haftanın günlerini hesapla
  const getWeekDays = () => {
    const date = new Date(currentDate)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Pazartesi'yi haftanın ilk günü yap

    const monday = new Date(date.setDate(diff))
    const weekDays = []

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(monday)
      currentDay.setDate(monday.getDate() + i)
      weekDays.push(currentDay)
    }

    return weekDays
  }

  // Belirli bir gün için etkinlikleri getir
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    // toursData'yı Date objesine göre filtrele
    return toursData.filter((event) => {
      if (!event.date) return false;
      const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
      if (!(eventDate instanceof Date) || isNaN(eventDate.getTime())) return false;
      return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
      );
    });
  }

  // Etkinlik tıklama işleyicisi
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  // Kayda gitme işleyicisi
  const navigateToRecord = (event: CalendarEvent | null) => {
      if (!event) return
      // Tur kaydına gitmek için onNavigate kullanılır (varsayılan view: data-view)
      // Filtreleme veya ID ile gitme gibi parametreler eklenebilir
      onNavigate('data-view', { filterType: 'tour', filterValue: event.id })
      setIsModalOpen(false)
  }

  // Aylık görünüm için takvim günlerini oluştur
  const renderMonthView = () => {
    const { firstDayIndex, daysInMonth, year, month } = getMonthDetails()
    const calendarDays = []

    // Önceki ayın günlerini ekle
    for (let i = 0; i < firstDayIndex; i++) {
      const prevMonthDay = new Date(year, month, 0 - (firstDayIndex - i - 1))
      calendarDays.push({
        day: prevMonthDay.getDate(),
        date: prevMonthDay,
        isCurrentMonth: false,
        events: getEventsForDay(prevMonthDay),
      })
    }

    // Mevcut ayın günlerini ekle
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      calendarDays.push({
        day,
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === new Date().toDateString(),
        events: getEventsForDay(date),
      })
    }

    // Sonraki ayın günlerini ekle
    const remainingDays = 7 - (calendarDays.length % 7)
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const nextMonthDay = new Date(year, month + 1, i)
        calendarDays.push({
          day: i,
          date: nextMonthDay,
          isCurrentMonth: false,
          events: getEventsForDay(nextMonthDay),
        })
      }
    }

    // Takvimi haftalara böl
    const weeks = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7))
    }

    return (
      <div className="rounded-md border">
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {dayNames.map((day, index) => (
            <div key={index} className="py-2 text-center font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`min-h-[100px] p-2 border-r border-b relative ${
                  !day.isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
                } ${day.isToday ? "bg-blue-50" : ""}`}
              >
                <div
                  className={`font-medium ${day.isToday ? "text-blue-600 bg-blue-100 rounded-full w-7 h-7 flex items-center justify-center" : ""}`}
                >
                  {day.day}
                </div>
                <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
                  {day.events.map((event) => (
                    <div
                      key={event.id}
                      className="text-xs p-1.5 rounded cursor-pointer flex items-center gap-1 text-white shadow hover:shadow-md transition-shadow"
                      style={{ backgroundColor: event.color || "#10b981" }}
                      onClick={() => handleEventClick(event)}
                    >
                      <span className="truncate font-medium">{event.title || event.tourName}</span>
                      <span className="ml-auto whitespace-nowrap opacity-80">({event.customers ?? event.customerName})</span>
                    </div>
                  ))}
                </div>
              </div>
            )),
          )}
        </div>
      </div>
    )
  }

  // Haftalık görünüm
  const renderWeekView = () => {
    const weekDays = getWeekDays()

    return (
      <div className="rounded-md border">
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((date, index) => (
            <div
              key={index}
              className={`py-3 text-center font-medium border-r last:border-r-0 ${
                date.toDateString() === new Date().toDateString() ? "bg-blue-50 text-blue-600" : "text-gray-500"
              }`}
            >
              <div className="text-sm">{dayNames[index]}</div>
              <div className="text-xl font-bold mt-1">{date.getDate()}</div>
              <div className="text-xs opacity-70">{monthNames[date.getMonth()]}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weekDays.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day)

            return (
              <div key={dayIndex} className="border-r last:border-r-0 p-2 min-h-[200px] space-y-1">
                {dayEvents.length > 0 ? (
                  dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="text-xs p-2 rounded cursor-pointer text-white shadow-sm hover:shadow-md transition-shadow"
                      style={{ backgroundColor: event.color || "#10b981" }}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="font-medium truncate mb-1">{event.title || event.tourName}</div>
                      <div className="flex items-center gap-1 text-xs opacity-90">
                        {event.time && (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </>
                        )}
                        <Users className="h-3 w-3 ml-auto" />
                        <span>{event.customers}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 text-center mt-4">Etkinlik yok</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Günlük görünüm
  const renderDayView = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7) // 7:00 - 20:00
    const dayEvents = getEventsForDay(currentDate)

    return (
      <div className="rounded-md border">
        <div className="grid grid-cols-1 border-b bg-gray-50">
          <div className="py-3 text-center font-medium text-gray-700">
            {fullDayNames[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}, {currentDate.getDate()}{" "}
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
        </div>

        {/* Eğer o gün için etkinlik varsa göster */}
        {dayEvents.length > 0 ? (
          <div className="p-4 space-y-3">
            <h3 className="font-medium text-gray-700 mb-3">Bu Günün Etkinlikleri ({dayEvents.length})</h3>
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg cursor-pointer text-white shadow hover:shadow-md transition-shadow"
                style={{ backgroundColor: event.color || "#10b981" }}
                onClick={() => handleEventClick(event)}
              >
                <div className="font-medium text-lg">{event.title || event.tourName}</div>
                <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
                  {event.time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{event.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{event.customers || event.customerName} kişi</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
                {event.totalPrice !== undefined && event.currency && (
                  <div className="mt-2 text-sm opacity-90">
                    <span className="font-medium">{formatCurrency(event.totalPrice, event.currency)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">Bu gün için etkinlik bulunmuyor</p>
            <p className="text-sm mt-1">Başka bir gün seçebilir veya yeni etkinlik ekleyebilirsiniz.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5" />
            Takvim
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Bugün
            </Button>
            
            {/* Manuel tarih girişi */}
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={manualDate}
                onChange={handleManualDateChange}
                onKeyPress={handleManualDateKeyPress}
                className="w-36"
                placeholder="Tarih seçin"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManualDateSubmit}
                disabled={!manualDate}
              >
                Git
              </Button>
            </div>
            
            <Button variant="outline" size="icon" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-medium min-w-[140px] text-center">
              {viewMode === "month"
                ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : viewMode === "week"
                  ? `${getWeekDays()[0].getDate()} ${monthNames[getWeekDays()[0].getMonth()]} - ${getWeekDays()[6].getDate()} ${monthNames[getWeekDays()[6].getMonth()]}`
                  : `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]}`}
            </div>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Tabs defaultValue="month" value={viewMode} onValueChange={setViewMode} className="w-[300px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="month">Aylık</TabsTrigger>
                <TabsTrigger value="week">Haftalık</TabsTrigger>
                <TabsTrigger value="day">Günlük</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => onNavigate("dashboard")}>
              Kapat
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Etkinlik Detayı</DialogTitle>
            {selectedEvent?.date && (
                <DialogDescription>
                    {new Date(selectedEvent.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </DialogDescription>
            )}
          </DialogHeader>
          {selectedEvent && (
            <div className="grid gap-4 py-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">{selectedEvent.title || selectedEvent.tourName}</span>
                </div>
                {selectedEvent.customerName && (
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-gray-500" />
                        <span>{selectedEvent.customerName} ({selectedEvent.customers} kişi)</span>
                    </div>
                )}
                {selectedEvent.time && (
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <span>{selectedEvent.time}</span>
                    </div>
                )}
                 {selectedEvent.location && (
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <span>{selectedEvent.location}</span>
                    </div>
                )}
                {selectedEvent.totalPrice !== undefined && selectedEvent.currency && (
                     <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{formatCurrency(selectedEvent.totalPrice, selectedEvent.currency)}</span>
                    </div>
                )}
                 {selectedEvent.serialNumber && (
                     <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Seri No: {selectedEvent.serialNumber}</span>
                    </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Kapat</Button>
            <Button onClick={() => navigateToRecord(selectedEvent)} disabled={!selectedEvent}>
              <ExternalLink className="mr-2 h-4 w-4" /> Kayda Git
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
