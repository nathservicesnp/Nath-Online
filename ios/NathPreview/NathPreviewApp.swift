import SwiftUI
import SafariServices

private let previewBase = "https://nath-official-preview.nathservicesnp.workers.dev"
private let nathBlue = Color(red: 18 / 255, green: 75 / 255, blue: 221 / 255)
private let nathInk = Color(red: 16 / 255, green: 30 / 255, blue: 72 / 255)
private let nathPaper = Color(red: 247 / 255, green: 249 / 255, blue: 255 / 255)

struct NathService: Identifiable {
    let id: String
    let en: String
    let ne: String
    let icon: String
    static let all: [NathService] = [
        .init(id: "business-pan", en: "Business PAN", ne: "व्यवसाय प्यान", icon: "building.2"),
        .init(id: "nid", en: "National ID (NID)", ne: "राष्ट्रिय परिचयपत्र", icon: "person.text.rectangle"),
        .init(id: "passport", en: "Passport", ne: "राहदानी", icon: "globe.asia.australia"),
        .init(id: "driving-license", en: "Driving License", ne: "सवारी चालक अनुमतिपत्र", icon: "car"),
        .init(id: "hib", en: "Health Insurance (HIB)", ne: "स्वास्थ्य बीमा", icon: "cross.case"),
        .init(id: "other", en: "Other Services", ne: "अन्य सेवाहरू", icon: "square.grid.2x2")
    ]
}

@main struct NathPreviewApp: App {
    var body: some Scene {
        WindowGroup { Dashboard().tint(nathBlue).preferredColorScheme(.light) }
    }
}

struct Dashboard: View {
    @AppStorage("nepali") private var nepali = false
    @AppStorage("preparation") private var preparation = ""
    @Environment(\.openURL) private var openURL
    @State private var clearRequested = false
    private func t(_ en: String, _ ne: String) -> String { nepali ? ne : en }

    var body: some View {
        TabView {
            NavigationStack {
                List {
                    Section {
                        VStack(alignment: .leading, spacing: 10) {
                            Image("NathLogo").resizable().scaledToFit()
                                .frame(width: 190, height: 64).accessibilityLabel("Nath Online Services")
                            Text(t("LOCAL CARE. NATIONWIDE SUPPORT.", "स्थानीय सेवा। देशभर सहयोग।"))
                                .font(.caption2.bold()).foregroundStyle(nathBlue)
                            Text(t("Forms, bills & bookings.", "फाराम, बिल र बुकिङ।"))
                                .font(.system(size: 32, weight: .semibold))
                            Text(t("With personal help.", "व्यक्तिगत सहयोगसहित।"))
                                .font(.system(size: 32, weight: .semibold)).foregroundStyle(nathBlue)
                            Text(t("Tell our Butwal team what you need. We explain the steps and confirm your charges before work begins.", "बुटवलको हाम्रो टोलीलाई आफ्नो आवश्यकता बताउनुहोस्। कामअघि प्रक्रिया र शुल्क पुष्टि गर्छौँ।"))
                                .font(.body).foregroundStyle(.secondary)
                            Text(t("PREVIEW · Test details only", "परीक्षण · नमुना विवरण मात्र")).font(.caption)
                        }.foregroundStyle(nathInk).padding(.vertical, 12)
                        Toggle("नेपाली / English", isOn: $nepali)
                        NavigationLink {
                            PreviewPage(path: (nepali ? "/ne" : "") + "/request")
                        } label: {
                            Text(t("Request a service  →", "सेवा अनुरोध  →"))
                                .font(.headline).foregroundStyle(.white)
                                .frame(maxWidth: .infinity, alignment: .leading).padding(16)
                                .background(nathBlue, in: RoundedRectangle(cornerRadius: 7))
                        }
                    }
                    Section(t("Choose the help you need.", "आवश्यक सहयोग छान्नुहोस्।")) {
                        ForEach(NathService.all) { service in
                            NavigationLink {
                                PreparationView(service: service, nepali: nepali, saved: $preparation)
                            } label: {
                                Label(nepali ? service.ne : service.en, systemImage: service.icon)
                                    .foregroundStyle(nathInk).padding(.vertical, 10)
                            }
                        }
                    }
                    Section {
                        NavigationLink(t("Track a test request", "परीक्षण अनुरोधको अवस्था")) {
                            PreviewPage(path: (nepali ? "/ne" : "") + "/track")
                                .navigationTitle(t("Request tracking", "अनुरोधको अवस्था"))
                        }
                        Text(t("Independent assistance service. Nath is not a government agency. Official requirements and in-person steps must be confirmed.", "नाथ स्वतन्त्र सहयोग सेवा हो, सरकारी निकाय होइन। आधिकारिक प्रक्रिया र उपस्थितिको आवश्यकता पुष्टि गर्नुपर्छ।"))
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }.scrollContentBackground(.hidden).background(nathPaper)
                    .navigationTitle(t("Services", "सेवाहरू")).navigationBarTitleDisplayMode(.inline)
            }.tabItem { Label(t("Services", "सेवाहरू"), systemImage: "square.grid.2x2") }

            NavigationStack {
                List {
                    Section(t("Protected workspace", "सुरक्षित कार्यक्षेत्र")) {
                        Text(t("Sign in with your existing staff passkey to manage requests, messages, quotes and status updates.", "अनुरोध, सन्देश, शुल्क प्रस्ताव र स्थिति व्यवस्थापन गर्न कर्मचारी पासकीबाट प्रवेश गर्नुहोस्।"))
                        Button(t("Open secure staff sign-in", "सुरक्षित कर्मचारी प्रवेश")) {
                            openURL(URL(string: previewBase + "/admin/login")!)
                        }
                        Text(t("Opens your browser for passkey support. Staff credentials are not stored in this app.", "पासकीका लागि ब्राउजर खुल्छ। यो एपमा कर्मचारीको प्रवेश विवरण राखिँदैन।"))
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }.navigationTitle(t("Staff", "कर्मचारी"))
            }.tabItem { Label(t("Staff", "कर्मचारी"), systemImage: "person.badge.key") }

            NavigationStack {
                List {
                    Section("Nath Online Services") {
                        Text("Butwal, Rupandehi, Nepal")
                        Text(t("Sunday–Friday · 9 AM–6 PM Nepal time", "आइतबार–शुक्रबार · बिहान ९–साँझ ६ बजे"))
                        Link("+977 9867302353", destination: URL(string: "tel:+9779867302353")!)
                        Link("WhatsApp", destination: URL(string: "https://wa.me/9779867302353")!)
                    }
                    Section(t("Privacy", "गोपनीयता")) {
                        Text(t("Checklists are saved in this app and may be included in your device backup. They are not sent to Nath. Requests use the website's privacy policy. Do not submit identity documents or medical records in this test version.", "तयारी सूची यो एपमा सुरक्षित हुन्छ र उपकरणको ब्याकअपमा समावेश हुन सक्छ। सूची नाथलाई पठाइँदैन। अनुरोधमा वेबसाइटको गोपनीयता नीति लागू हुन्छ। परीक्षणमा परिचयपत्र वा स्वास्थ्य विवरण नपठाउनुहोस्।"))
                        NavigationLink(t("Read privacy policy", "गोपनीयता नीति")) {
                            PreviewPage(path: (nepali ? "/ne" : "") + "/privacy")
                        }
                        Button(t("Clear saved checklists", "तयारी सूची मेटाउनुहोस्"), role: .destructive) { clearRequested = true }
                    }
                }.navigationTitle(t("Help", "सहयोग"))
                    .confirmationDialog(t("Clear local checklists? Submitted requests will not be deleted.", "तयारी सूची मेटाउने? पठाइएका अनुरोध मेटिँदैनन्।"), isPresented: $clearRequested, titleVisibility: .visible) {
                        Button(t("Clear", "मेटाउनुहोस्"), role: .destructive) { preparation = "" }
                    }
            }.tabItem { Label(t("Help", "सहयोग"), systemImage: "questionmark.circle") }
        }
    }
}

struct PreparationView: View {
    let service: NathService
    let nepali: Bool
    @Binding var saved: String
    private let en = ["Describe the help I need", "Confirm requirements with Nath", "Review the quoted fees", "Confirm any required office visit"]
    private let ne = ["आवश्यक सहयोग स्पष्ट गर्ने", "नाथसँग आवश्यक विवरण बुझ्ने", "प्रस्तावित शुल्क बुझ्ने", "कार्यालय जानुपर्ने भए पुष्टि गर्ने"]
    private func t(_ en: String, _ ne: String) -> String { nepali ? ne : en }
    private func checked(_ index: Int) -> Binding<Bool> {
        let key = "\(service.id).\(index)"
        return Binding(get: { saved.split(separator: ",").contains(Substring(key)) }, set: { value in
            var keys = Set(saved.split(separator: ",").map(String.init))
            if value { keys.insert(key) } else { keys.remove(key) }
            saved = keys.sorted().joined(separator: ",")
        })
    }
    var body: some View {
        List {
            Section(t("My preparation", "मेरो तयारी")) {
                Text(t("This checklist works offline and is saved in this app. These are planning steps, not an official document list.", "यो सूची अफलाइन चल्छ र यो एपमा सुरक्षित हुन्छ। यो आधिकारिक कागजात सूची होइन।"))
                ForEach(0..<en.count, id: \.self) { index in
                    Toggle(nepali ? ne[index] : en[index], isOn: checked(index)).padding(.vertical, 8)
                }
            }
            Section {
                Text(t("Charges will be confirmed before work starts. Do not enter identity numbers, passwords or health records in the preview.", "कामअघि शुल्क जानकारी दिइनेछ। परीक्षणमा परिचयपत्र नम्बर, पासवर्ड वा स्वास्थ्य विवरण नराख्नुहोस्।"))
                NavigationLink(t("Start a test request", "परीक्षण अनुरोध सुरु गर्नुहोस्")) {
                    PreviewPage(path: (nepali ? "/ne" : "") + "/request?service=" + service.id)
                }
            }
        }.navigationTitle(nepali ? service.ne : service.en)
    }
}

struct PreviewPage: UIViewControllerRepresentable {
    let path: String
    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: URL(string: previewBase + path)!)
    }
    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}
