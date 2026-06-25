import { Checkbox } from "@/components/ui/checkbox";

export interface CheckboxListOption {
  value: string;
  label: string;
}

interface Props {
  options: CheckboxListOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  emptyText?: string;
}

/**
 * Lista de checkboxes inline (sem popover) — segura para usar dentro de
 * Sheets/Dialogs modais, onde um Popover portado fica sem pointer-events.
 */
export function InlineCheckboxList({ options, value, onValueChange, emptyText }: Props) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyText ?? "Nada disponível."}
      </p>
    );
  }

  const toggle = (optionValue: string) => {
    onValueChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted"
        >
          <Checkbox
            checked={value.includes(option.value)}
            onCheckedChange={() => toggle(option.value)}
          />
          <span className="truncate">{option.label}</span>
        </label>
      ))}
    </div>
  );
}
