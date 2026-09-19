export type DemoRequest = {
  trackingId: string;
  name: string;
  phone: string;
  service: string;
  details: string;
  status: "Received";
  createdAt: string;
};

const storageKey = "nath-demo-requests";

export function createTrackingId(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `NOS-${date}-${random}`;
}

export function saveDemoRequest(request: DemoRequest) {
  const existing = getDemoRequests();
  localStorage.setItem(storageKey, JSON.stringify([request, ...existing].slice(0, 10)));
}

export function getDemoRequests(): DemoRequest[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]") as DemoRequest[];
  } catch {
    return [];
  }
}

export function findDemoRequest(trackingId: string, phone: string) {
  return getDemoRequests().find(
    (item) => item.trackingId.toLowerCase() === trackingId.trim().toLowerCase() && item.phone === phone.trim()
  );
}
