import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChoiceItem } from '@/sample/settings/types/settings';
import type { ReactNode, SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface SettingsPageCardProps {
  title: string;
  description: string;
  children: ReactNode;
  submitLabel?: string;
  onSubmit?: () => void;
}

export function SettingsPageCard({
  title,
  description,
  children,
  submitLabel,
  onSubmit,
}: SettingsPageCardProps) {
  const { t } = useTranslation('sample');
  const resolvedSubmitLabel = submitLabel ?? t('settings.save');

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
    toast.success(t('settings.saved'));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6">{children}</CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline">
            {t('settings.cancel')}
          </Button>
          <Button type="submit">{resolvedSubmitLabel}</Button>
        </CardFooter>
      </Card>
    </form>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
}

export function TextField({
  id,
  label,
  description,
  placeholder,
  defaultValue,
  type = 'text',
}: TextFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} defaultValue={defaultValue} />
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
    </div>
  );
}

interface TextareaFieldProps {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
}

export function TextareaField({
  id,
  label,
  description,
  placeholder,
  defaultValue,
}: TextareaFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="min-h-28"
      />
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
    </div>
  );
}

interface NativeSelectFieldProps {
  id: string;
  label: string;
  description?: string;
  defaultValue: string;
  options: readonly ChoiceItem[];
}

export function NativeSelectField({
  id,
  label,
  description,
  defaultValue,
  options,
}: NativeSelectFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
    </div>
  );
}

interface SettingToggleRowProps {
  title: string;
  description: string;
  defaultChecked?: boolean;
}

export function SettingToggleRow({
  title,
  description,
  defaultChecked = false,
}: SettingToggleRowProps) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <span className="grid gap-1">
        <span className="font-medium text-sm leading-none">{title}</span>
        <span className="text-muted-foreground text-sm leading-relaxed">{description}</span>
      </span>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-primary"
      />
    </label>
  );
}

interface ChoiceCardProps {
  item: ChoiceItem;
  selected: boolean;
  onSelect: () => void;
  swatchClassName?: string;
}

export function ChoiceCard({ item, selected, onSelect, swatchClassName }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-xl border p-4 text-left transition-colors hover:bg-accent/60',
        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card'
      )}
      aria-pressed={selected}
    >
      <span className="mb-3 flex items-center gap-2">
        {swatchClassName ? <span className={cn('size-4 rounded-full', swatchClassName)} /> : null}
        <span className="font-medium text-sm">{item.label}</span>
      </span>
      <span className="text-muted-foreground text-xs leading-relaxed">{item.description}</span>
    </button>
  );
}
