import { CalendarIcon, InfoIcon, Trash2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { borcSil } from "@/actions/borc-actions"
import type { Borc } from "@/types/borc"

interface BorcItemProps {
  borc: Borc
}

export function BorcItem({ borc }: BorcItemProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{borc.description}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{borc.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            <span>{formatDate(borc.date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium">{formatCurrency(borc.amount, borc.currency)}</span>
          <form action={borcSil}>
            <input type="hidden" name="borcId" value={borc.id} />
            <Button variant="ghost" size="icon" type="submit">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
