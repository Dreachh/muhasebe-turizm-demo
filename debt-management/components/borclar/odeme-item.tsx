import { CalendarIcon, InfoIcon } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Odeme } from "@/types/odeme"

interface OdemeItemProps {
  odeme: Odeme
}

export function OdemeItem({ odeme }: OdemeItemProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">Ödeme</span>
            {odeme.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{odeme.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            <span>{formatDate(odeme.date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-green-500">{formatCurrency(odeme.amount, odeme.currency)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
