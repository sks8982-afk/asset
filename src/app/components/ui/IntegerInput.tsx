import type { InputHTMLAttributes } from 'react';

/** 원 단위 입력이 넘지 않을 자릿수 (Number 정밀도 안) */
const MAX_DIGITS = 15;

type IntegerInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number;
  onValueChange: (value: number) => void;
};

/** 0 이상 정수 입력 — 쉼표로 끊어 보여 주고 숫자만 받는다 (모바일 숫자 키패드) */
export function IntegerInput({ value, onValueChange, ...rest }: IntegerInputProps) {
  const shown = Number.isFinite(value) && value > 0 ? Math.floor(value).toLocaleString('ko-KR') : '0';
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, MAX_DIGITS);
        onValueChange(digits === '' ? 0 : Number(digits));
      }}
    />
  );
}
