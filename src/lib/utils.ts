import { clsx } from 'clsx';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return clsx(inputs);
}
