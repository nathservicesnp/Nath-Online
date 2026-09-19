export type Service = {
  id: string;
  icon: string;
  title: string;
  nepali: string;
  description: string;
  examples: string[];
};

export const services: Service[] = [
  { id: "government", icon: "🏛️", title: "Government Services", nepali: "सरकारी सेवा", description: "Guidance and application support for essential government services.", examples: ["Citizenship", "Passport", "PAN", "Voter ID"] },
  { id: "utilities", icon: "💡", title: "Utility Payments", nepali: "बिल भुक्तानी", description: "Convenient help with everyday household and connectivity bills.", examples: ["Electricity", "Water", "Internet"] },
  { id: "tickets", icon: "🎟️", title: "Ticket Booking", nepali: "टिकट बुकिङ", description: "Booking assistance for travel and events across available providers.", examples: ["Bus", "Airline", "Events", "Train"] },
  { id: "banking", icon: "🏦", title: "Banking & Remittance", nepali: "बैंकिङ तथा रेमिट्यान्स", description: "Simple guidance for digital banking, wallets and remittance services.", examples: ["Mobile banking", "Bank account", "eSewa", "Khalti"] },
  { id: "education", icon: "🎓", title: "Education Forms", nepali: "शैक्षिक फाराम", description: "Application support for schools, scholarships, exams and universities.", examples: ["Admissions", "Scholarships", "SEE / NEB", "University"] }
];
