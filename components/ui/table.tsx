import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, children, ...props }, ref) => {
  // Filter out whitespace text nodes to avoid hydration errors
  const filteredChildren = React.Children.toArray(children).filter(
    (child) => typeof child !== "string" || (typeof child === "string" && child.trim() !== "")
  )
  
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className || "")}
        {...props}
      >
        {filteredChildren}
      </table>
    </div>
  )
})
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  // Filter out whitespace text nodes
  const filteredChildren = React.Children.toArray(children).filter(
    (child) => typeof child !== "string" || (typeof child === "string" && child.trim() !== "")
  )
  
  return (
    <thead ref={ref} className={cn("[&_tr]:border-b", className || "")} {...props}>
      {filteredChildren}
    </thead>
  )
})
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  // Filter out whitespace text nodes
  const filteredChildren = React.Children.toArray(children).filter(
    (child) => typeof child !== "string" || (typeof child === "string" && child.trim() !== "")
  )
  
  return (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className || "")}
      {...props}
    >
      {filteredChildren}
    </tbody>
  )
})
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className || ""
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, children, ...props }, ref) => {
  // Filter out whitespace text nodes to avoid invalid children in <tr>
  const filteredChildren = React.Children.toArray(children).filter(
    (child) => typeof child !== "string"
  )
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className || ""
      )}
      {...props}
    >
      {filteredChildren}
    </tr>
  )
})
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className || ""
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className || "")}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className || "")}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}