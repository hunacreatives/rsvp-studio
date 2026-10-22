import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToTopNow } from '@/lib/lenis';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    scrollToTopNow();
  }, [pathname]);

  return null;
}
