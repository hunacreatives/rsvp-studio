import { useEffect } from "react";

/**
 * Mobile-only device in the reference: instead of a static background
 * image, a short looping floral video is scrubbed by scroll position
 * (video.currentTime = scrollPercent * duration), so the flowers appear
 * to bloom in as the guest scrolls down the page rather than just
 * sitting still. Desktop keeps the plain static image (see
 * CinematicTemplate.tsx, which shows/hides each via a container query
 * rather than a viewport media query — same reasoning as the rest of
 * this template's CSS).
 *
 * `playbackRate = 0` (not `pause()`) is required for iOS Safari to keep
 * `currentTime` seekable without showing the native play-button overlay.
 */
export function useScrollScrubVideo(videoRef: React.RefObject<HTMLVideoElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    if (!video) return;

    let cleanupScroll: (() => void) | undefined;

    const setupScrollScrub = () => {
      const duration = video.duration;
      const handleScroll = () => {
        const scrollTop = window.scrollY || window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
        video.currentTime = scrollPercent * duration;
      };
      handleScroll();
      window.addEventListener("scroll", handleScroll, { passive: true });
      cleanupScroll = () => window.removeEventListener("scroll", handleScroll);
    };

    const initVideo = () => {
      try {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              video.playbackRate = 0;
              video.currentTime = 0;
              setupScrollScrub();
            })
            .catch(() => setupScrollScrub());
        } else {
          video.playbackRate = 0;
          setupScrollScrub();
        }
      } catch {
        // Restrictive WebView — static poster frame shows instead.
      }
    };

    if (video.readyState >= 1) {
      initVideo();
    } else {
      video.addEventListener("loadedmetadata", initVideo, { once: true });
    }

    return () => {
      cleanupScroll?.();
      video.removeEventListener("loadedmetadata", initVideo);
    };
  }, [videoRef, enabled]);
}
