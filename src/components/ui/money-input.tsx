'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

type MoneyInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  value: number | string | undefined;
  onValueChange: (value: number | undefined) => void;
};

const groupThousands = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function normalizeDraft(value: string) {
  const raw = value.replace(/\s/g, '').replace(/[^\d,.]/g, '');
  if (!raw) return { display: '', numeric: undefined as number | undefined };
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  const decimalIndex = comma >= 0 && dot >= 0 ? Math.max(comma, dot) : comma >= 0 ? comma : dot;
  const integerRaw = decimalIndex >= 0 ? raw.slice(0, decimalIndex) : raw;
  const fractionRaw = decimalIndex >= 0 ? raw.slice(decimalIndex + 1).replace(/[,.]/g, '').slice(0, 2) : '';
  const integer = (integerRaw.replace(/[,.]/g, '').replace(/^0+(?=\d)/, '') || '0');
  const hasDecimal = decimalIndex >= 0;
  const display = `${groupThousands(integer)}${hasDecimal ? `,${fractionRaw}` : ''}`;
  const numeric = Number(`${integer}.${fractionRaw || '0'}`);
  return { display, numeric: Number.isFinite(numeric) ? numeric : undefined };
}

export function formatMoney(value: number | string | undefined) {
  const amount = typeof value === 'string' ? normalizeDraft(value).numeric : value;
  if (amount === undefined || !Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(amount).replace(/[\u00a0\u202f]/g, ' ');
}

export function MoneyInput({ value, onValueChange, onBlur, onFocus, ...props }: MoneyInputProps) {
  const [draft, setDraft] = useState(() => formatMoney(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(formatMoney(value));
  }, [value]);

  return <Input
    {...props}
    type="text"
    inputMode="decimal"
    value={draft}
    onFocus={event => { focused.current = true; onFocus?.(event); }}
    onChange={event => {
      const next = normalizeDraft(event.target.value);
      setDraft(next.display);
      onValueChange(next.numeric);
    }}
    onBlur={event => {
      focused.current = false;
      setDraft(formatMoney(value));
      onBlur?.(event);
    }}
    placeholder={props.placeholder ?? '0,00'}
    aria-label={props['aria-label'] ?? 'Valor em Kwanzas'}
  />;
}
