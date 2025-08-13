export function getDeviceType(): string {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|phone|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    return "mobile";
  }
  
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return "tablet";
  }
  
  return "desktop";
}