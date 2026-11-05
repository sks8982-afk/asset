'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Card } from './Card';

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' } as const;

type ModalProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** 제목 앞 아이콘 (장식용) */
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** 바깥 어두운 곳을 눌러 닫을 수 있는지 (창 안에서 끌다가 바깥에서 놓은 것은 무시) */
  closeOnBackdrop?: boolean;
  size?: keyof typeof WIDTHS;
  /** 다른 창·알림 위에 띄우기 */
  elevated?: boolean;
  /** 카드 테두리·바탕 덮어쓰기 */
  className?: string;
};

/** 공통 대화 상자 — Card 모양, Esc로 닫기, 열리면 창으로 초점 이동 */
export function Modal({
  title, subtitle, icon, onClose, children, closeOnBackdrop = true, size = 'md', elevated = false, className,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  /** 누르기 시작한 곳이 바깥이었는지 — 창 안에서 글자를 고르다 바깥에서 놓으면 닫지 않는다 */
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-slate-950/50 p-4 dark:bg-black/60 ${elevated ? 'z-[110]' : 'z-50'}`}
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (closeOnBackdrop && pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full outline-none ${WIDTHS[size]}`}
      >
        <Card
          title={<span id={titleId}>{title}</span>}
          subtitle={subtitle}
          icon={icon}
          actions={
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="-m-1.5 rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <X size={18} aria-hidden="true" />
            </button>
          }
          className={twMerge('max-h-[90dvh] overflow-y-auto shadow-xl dark:bg-slate-800', className)}
        >
          {children}
        </Card>
      </div>
    </div>
  );
}
