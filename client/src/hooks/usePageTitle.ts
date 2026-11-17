import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "Dashboard · Skill Swap". */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title === 'Skill Swap' ? title : `${title} · Skill Swap`;
  }, [title]);
}
