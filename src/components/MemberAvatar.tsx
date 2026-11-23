import { useEffect, useState } from 'react';

interface MemberAvatarProps {
  name: string;
  primarySrc?: string | null;
  fallbackSrc?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md', { box: string; text: string }> = {
  xs: { box: 'w-6 h-6', text: 'text-[10px]' },
  sm: { box: 'w-8 h-8', text: 'text-[11px]' },
  md: { box: 'w-9 h-9', text: 'text-xs' },
};

export function MemberAvatar({
  name,
  primarySrc,
  fallbackSrc,
  size = 'sm',
  className = '',
}: MemberAvatarProps) {
  const candidates = [primarySrc?.trim() || '', fallbackSrc?.trim() || ''].filter(
    (src, index, arr) => Boolean(src) && arr.indexOf(src) === index,
  );

  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidatesKey = candidates.join('|');

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidatesKey]);

  const activeSrc = candidates[candidateIndex] || '';
  const { box, text } = SIZE_CLASSES[size];

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?';

  if (activeSrc) {
    return (
      <img
        src={activeSrc}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setCandidateIndex((idx) => idx + 1)}
        className={`${box} rounded-full object-cover border border-[#2C312C] bg-[#181A18] shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${box} ${text} rounded-full bg-[#222622] border border-[#2C312C] text-[#F2F2EE] font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
}
