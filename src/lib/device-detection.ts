export function getDeviceType(): string {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for mobile devices
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent)) {
    // More specific mobile detection
    if (/ipad/i.test(userAgent)) {
      return "tablet";
    }
    if (/iphone|ipod|android.*mobile/i.test(userAgent)) {
      return "mobile";
    }
    return "mobile";
  }
  
  // Check for tablet (non-iPad tablets)
  if (/tablet|android(?!.*mobile)/i.test(userAgent)) {
    return "tablet";
  }
  
  // Default to desktop
  return "desktop";
}