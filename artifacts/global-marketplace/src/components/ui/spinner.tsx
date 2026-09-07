import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const { tr } = useLocale();
  return (
    <Loader2Icon
      role="status"
      aria-label={tr('ui.loading')}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
