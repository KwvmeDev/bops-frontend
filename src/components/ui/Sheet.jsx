import { Drawer } from 'vaul';
import { cn } from '../../lib/utils';

export function Sheet({ open, onOpenChange, children, title, description }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className={cn(
          'fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl',
          'max-h-[88vh] overflow-hidden',
          'bg-surface-subtle border-t border-surface-overlay',
          'focus:outline-none',
          'md:left-auto md:top-0 md:bottom-0 md:right-0 md:w-[420px] md:max-h-none md:overflow-auto md:rounded-t-none md:rounded-l-2xl md:border-t-0 md:border-l'
        )}>
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-surface-overlay md:hidden" />
          {(title || description) && (
            <div className="px-5 py-4 border-b border-surface-muted/50">
              {title && <Drawer.Title className="text-base font-semibold text-zinc-100">{title}</Drawer.Title>}
              {description && <Drawer.Description className="text-sm text-zinc-400 mt-0.5">{description}</Drawer.Description>}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function SheetTrigger({ children }) {
  return <Drawer.Trigger asChild>{children}</Drawer.Trigger>;
}
