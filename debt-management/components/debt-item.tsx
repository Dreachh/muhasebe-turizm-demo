import { CalendarIcon, InfoIcon, Trash2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { deleteDebt } from "@/actions/debt-actions"
import type { Debt } from "@/types/debt"

interface DebtItemProps {
  debt: Debt
}

export function DebtItem({ debt }: DebtItemProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{debt.description}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{debt.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            <span>{formatDate(debt.date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium">{formatCurrency(debt.amount, debt.currency)}</span>
          <form action={deleteDebt}>
            <input type="hidden" name="debtId" value={debt.id} />
            <Button variant="ghost" size="icon" type="submit">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
