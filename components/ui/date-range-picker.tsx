"use client"

import * as React from "react"
import { addDays, format, parse } from "date-fns"
import { tr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  placeholder = "Tarih Aralığı Seçin",
  disabled = false,
}: DatePickerWithRangeProps) {
  const [fromInput, setFromInput] = React.useState("")
  const [toInput, setToInput] = React.useState("")

  // Tarih değiştiğinde input'ları güncelle
  React.useEffect(() => {
    if (date?.from) {
      setFromInput(format(date.from, "dd.MM.yyyy"))
    } else {
      setFromInput("")
    }
    if (date?.to) {
      setToInput(format(date.to, "dd.MM.yyyy"))
    } else {
      setToInput("")
    }
  }, [date])

  const handleFromInputChange = (value: string) => {
    setFromInput(value)
    
    // Tarih formatını parse et (dd.MM.yyyy)
    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd.MM.yyyy", new Date())
        if (!isNaN(parsedDate.getTime())) {
          setDate({
            from: parsedDate,
            to: date?.to
          })
        }
      } catch (error) {
        // Geçersiz tarih formatı
      }
    }
  }

  const handleToInputChange = (value: string) => {
    setToInput(value)
    
    // Tarih formatını parse et (dd.MM.yyyy)
    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd.MM.yyyy", new Date())
        if (!isNaN(parsedDate.getTime())) {
          setDate({
            from: date?.from,
            to: parsedDate
          })
        }
      } catch (error) {
        // Geçersiz tarih formatı
      }
    }
  }
  return (
    <div className={cn("grid gap-2", className || "")}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date ? "text-muted-foreground" : ""
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd LLL y", { locale: tr })} -{" "}
                  {format(date.to, "dd LLL y", { locale: tr })}
                </>
              ) : (
                format(date.from, "dd LLL y", { locale: tr })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex gap-2 items-center">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Başlangıç</label>
                <Input
                  placeholder="dd.MM.yyyy"
                  value={fromInput}
                  onChange={(e) => handleFromInputChange(e.target.value)}
                  className="w-[120px] text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Bitiş</label>
                <Input
                  placeholder="dd.MM.yyyy"
                  value={toInput}
                  onChange={(e) => handleToInputChange(e.target.value)}
                  className="w-[120px] text-sm"
                />
              </div>
            </div>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={tr}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}