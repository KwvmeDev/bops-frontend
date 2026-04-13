import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#27272a',
          border: '1px solid #3f3f46',
          color: '#fafafa',
          borderRadius: '10px',
        },
        classNames: {
          success: '!border-emerald-500/30',
          error:   '!border-red-500/30',
          warning: '!border-amber-500/30',
          info:    '!border-blue-500/30',
        },
      }}
      richColors
      closeButton
    />
  );
}

export { toast } from 'sonner';
