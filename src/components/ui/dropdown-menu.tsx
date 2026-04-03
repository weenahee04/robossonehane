import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({ open: false, setOpen: () => {} });

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { open, setOpen } = React.useContext(DropdownMenuContext);
  const child = children as React.ReactElement<any>;
  if (asChild && React.isValidElement(child)) {
    return React.cloneElement(child, { onClick: () => setOpen(!open) } as any);
  }
  return <button onClick={() => setOpen(!open)}>{children}</button>;
}

function DropdownMenuContent({ children, className, align = 'end' }: { children: React.ReactNode; className?: string; align?: 'start' | 'end' }) {
  const { open } = React.useContext(DropdownMenuContext);
  if (!open) return null;
  return (
    <div className={cn("absolute z-50 mt-1 min-w-[160px] rounded-xl border border-border bg-white shadow-lg py-1", align === 'end' ? 'right-0' : 'left-0', className)}>
      {children}
    </div>
  );
}

function DropdownMenuItem({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const { setOpen } = React.useContext(DropdownMenuContext);
  return (
    <button className={cn("w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors", className)}
      onClick={() => { onClick?.(); setOpen(false); }}>
      {children}
    </button>
  );
}

function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-border" />;
}

function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}>{children}</div>;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel }
