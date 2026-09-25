import React, { useId } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface ReferenceSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function ReferenceSearchField({
  value,
  onChange,
  placeholder = 'Search operators, concepts, examples…',
  label = 'Search reference',
}: ReferenceSearchFieldProps) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mist)] pointer-events-none"
        aria-hidden
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 h-10 text-[14px]"
      />
    </div>
  );
}
