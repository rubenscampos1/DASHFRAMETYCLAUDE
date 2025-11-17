/**
 * Viewport Height Handler
 * 
 * Manages dynamic viewport height across devices, especially mobile
 * Handles keyboard opening/closing and orientation changes
 */

export function initViewportHeight() {
  // Function to set custom viewport height property
  const setViewportHeight = () => {
    // Get actual viewport height
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Also update our custom properties
    document.documentElement.style.setProperty('--vh-small', `${window.innerHeight}px`);
    document.documentElement.style.setProperty('--vh-large', `${window.innerHeight}px`);
  };

  // Initial call
  setViewportHeight();

  // Update on resize (throttled for performance)
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setViewportHeight, 100);
  });

  // Update on orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 100);
  });

  // Handle visual viewport changes (iOS Safari keyboard)
  if ('visualViewport' in window && window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportHeight);
    window.visualViewport.addEventListener('scroll', setViewportHeight);
  }
}
