import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

export function SamplePasswordInput({
  className,
  disabled,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn('relative rounded-md', className)}>
      <Input
        type={showPassword ? 'text' : 'password'}
        className="h-9 rounded-md px-3 pr-9 shadow-xs"
        disabled={disabled}
        {...props}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        className="absolute inset-e-1 top-1/2 size-6 -translate-y-1/2 rounded-md text-muted-foreground"
        onClick={() => setShowPassword((value) => !value)}
      >
        {showPassword ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}
        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
      </Button>
    </div>
  );
}
