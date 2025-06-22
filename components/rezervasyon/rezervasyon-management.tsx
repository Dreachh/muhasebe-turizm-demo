"use client"

import { useState, useEffect } from 'react'
import { RezervasyonForm } from './rezervasyon-form'
import { RezervasyonListe } from './rezervasyon-liste'
import { useToast } from '@/hooks/use-toast'
import { getReservations } from '@/lib/db'
import { Rezervasyon } from '@/types/rezervasyon-types'

type ViewMode = 'list' | 'create' | 'edit'

export function RezervasyonManagement() {
  const { toast } = useToast()
  const [currentView, setCurrentView] = useState<ViewMode>('list')
  const [editingReservation, setEditingReservation] = useState<Rezervasyon | null>(null)
  const [reservations, setReservations] = useState<Rezervasyon[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Rezervasyonları yükle
  const loadReservations = async () => {
    setIsLoading(true)
    try {
      const data = await getReservations()
      setReservations(data || [])
    } catch (error) {
      console.error('Rezervasyonlar yüklenirken hata:', error)
      toast({
        title: "Hata",
        description: "Rezervasyonlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Component mount olduğunda rezervasyonları yükle
  useEffect(() => {
    loadReservations()
  }, [])

  // Yeni rezervasyon oluşturma
  const handleAddNew = () => {
    setEditingReservation(null)
    setCurrentView('create')
  }

  // Rezervasyon düzenleme
  const handleEdit = (reservation: Rezervasyon) => {
    setEditingReservation(reservation)
    setCurrentView('edit')
  }
  // Form kaydetme
  const handleFormSave = async (reservationData: any) => {
    console.log('handleFormSave çağrıldı:', reservationData);
    
    try {
      // Önce listeyi yenile
      await loadReservations();
      
      // Sonra listeye dön
      setCurrentView('list');
      setEditingReservation(null);
      
      // Toast mesajını burada gösterme, form bileşeni zaten gösteriyor
      console.log('Liste yenilendi ve listeye dönüldü');
    } catch (error) {
      console.error('Liste yenilenirken hata:', error);
      toast({
        title: "Uyarı",
        description: "Kayıt başarılı ama liste yenilenemedi. Sayfayı yenileyin.",
        variant: "default",
      });
    }
  }

  // Form iptal
  const handleFormCancel = () => {
    setEditingReservation(null)
    setCurrentView('list')
  }

  // Navigation handler
  const handleNavigate = (view: string) => {
    if (view === 'main-dashboard' || view === 'list') {
      setCurrentView('list')
    }
  }

  // Refresh handler
  const handleRefresh = async () => {
    await loadReservations()
  }

  // Hangi view'ı göstereceğini belirle
  switch (currentView) {
    case 'create':
      return (
        <RezervasyonForm
          mode="create"
          onSave={handleFormSave}
          onCancel={handleFormCancel}
          onNavigate={handleNavigate}
        />
      )

    case 'edit':
      return (
        <RezervasyonForm
          key={editingReservation ? editingReservation.id : 'new'}
          mode="edit"
          reservationId={editingReservation?.id}
          editData={editingReservation}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
          onNavigate={handleNavigate}
          onEditComplete={() => setCurrentView('list')}
        />
      )

    case 'list':
    default:
      return (
        <RezervasyonListe
          reservationsData={reservations}
          isLoading={isLoading}
          onAddNew={handleAddNew}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
        />
      )
  }
}
