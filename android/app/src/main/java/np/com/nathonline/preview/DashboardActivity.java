package np.com.nathonline.preview;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.widget.*;

/** Native preparation stays on the device; request records stay in the protected service. */
public class DashboardActivity extends Activity {
    private static final String BASE = "https://nath-official-preview.nathservicesnp.workers.dev";
    private static final String[] IDS = {"business-pan", "nid", "passport", "driving-license", "hib", "other"};
    private static final String[] EN = {"Business PAN", "National ID (NID)", "Passport", "Driving License", "Health Insurance (HIB)", "Other Services"};
    private static final String[] NE = {"व्यवसाय प्यान", "राष्ट्रिय परिचयपत्र", "राहदानी", "सवारी चालक अनुमतिपत्र", "स्वास्थ्य बीमा", "अन्य सेवाहरू"};
    private static final String[] STEPS_EN = {"Describe the help I need", "Confirm requirements with Nath", "Review the quoted fees", "Confirm any required office visit"};
    private static final String[] STEPS_NE = {"आवश्यक सहयोग स्पष्ट गर्ने", "नाथसँग आवश्यक विवरण बुझ्ने", "प्रस्तावित शुल्क बुझ्ने", "कार्यालय जानुपर्ने भए पुष्टि गर्ने"};
    private SharedPreferences prefs;
    private boolean nepali;
    private LinearLayout content;
    private final int green = Color.rgb(18, 62, 57);

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("preparation", MODE_PRIVATE);
        nepali = prefs.getBoolean("nepali", false);
        home();
    }
    private String t(String en, String ne) { return nepali ? ne : en; }
    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density); }
    private void page(String heading) {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(246, 248, 245));
        scroll.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(20), dp(20), dp(20), dp(28));
        scroll.addView(content);
        setContentView(scroll);
        label("NATH ONLINE SERVICES", 14, true);
        label(heading, 30, true);
        label(t("PREVIEW · Test details only", "परीक्षण · नमुना विवरण मात्र"), 13, false);
    }
    private void label(String text, int size, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(green);
        if (bold) view.setTypeface(null, Typeface.BOLD);
        view.setPadding(0, dp(8), 0, dp(12));
        content.addView(view);
    }
    private void button(String text, Runnable action) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextSize(17);
        button.setTextColor(green);
        button.setGravity(android.view.Gravity.CENTER_VERTICAL | android.view.Gravity.START);
        button.setPadding(dp(18), dp(14), dp(18), dp(14));
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.WHITE);
        background.setCornerRadius(dp(16));
        background.setStroke(dp(1), Color.rgb(211, 224, 216));
        button.setBackground(background);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, dp(6), 0, dp(6));
        button.setMinHeight(dp(60));
        content.addView(button, params);
        button.setOnClickListener(v -> action.run());
    }
    private void home() {
        page(t("All services.\nOne place.", "सबै सेवा।\nएकै ठाउँमा।"));
        button(nepali ? "English" : "नेपाली", () -> {
            nepali = !nepali;
            prefs.edit().putBoolean("nepali", nepali).apply();
            home();
        });
        label(t("How can we help?", "के सहयोग चाहिन्छ?"), 21, true);
        for (int i = 0; i < IDS.length; i++) {
            final int service = i;
            button((nepali ? NE[i] : EN[i]) + "  ›", () -> service(service));
        }
        button(t("Track a request", "अनुरोधको अवस्था हेर्नुहोस्"), () -> openPage("/track"));
        button(t("Staff workspace", "कर्मचारी कार्यक्षेत्र"), this::staff);
        button(t("Contact & privacy", "सम्पर्क र गोपनीयता"), this::support);
        label(t("Independent assistance service. Nath is not a government agency. Official requirements, fees and in-person steps must be confirmed.", "नाथ स्वतन्त्र सहयोग सेवा हो, सरकारी निकाय होइन। आधिकारिक प्रक्रिया, शुल्क र उपस्थितिको आवश्यकता पुष्टि गर्नुपर्छ।"), 14, false);
    }
    private void service(int index) {
        page(nepali ? NE[index] : EN[index]);
        label(t("My preparation", "मेरो तयारी"), 22, true);
        label(t("Your checklist works offline and is saved only on this phone. These are planning steps, not an official document list.", "यो तयारी सूची अफलाइन चल्छ र यही फोनमा मात्र सुरक्षित हुन्छ। यो आधिकारिक कागजात सूची होइन।"), 15, false);
        for (int i = 0; i < STEPS_EN.length; i++) {
            final String key = IDS[index] + "." + i;
            CheckBox check = new CheckBox(this);
            check.setText(nepali ? STEPS_NE[i] : STEPS_EN[i]);
            check.setTextSize(17);
            check.setMinHeight(dp(56));
            check.setChecked(prefs.getBoolean(key, false));
            check.setOnCheckedChangeListener((v, checked) -> prefs.edit().putBoolean(key, checked).apply());
            content.addView(check);
        }
        label(t("Charges will be confirmed before work starts. Do not enter identity numbers, passwords or health records in the preview.", "काम सुरु गर्नुअघि शुल्क जानकारी दिइनेछ। परीक्षणमा परिचयपत्र नम्बर, पासवर्ड वा स्वास्थ्य विवरण नराख्नुहोस्।"), 15, false);
        button(t("Start a test request", "परीक्षण अनुरोध सुरु गर्नुहोस्"), () -> openPage("/request?service=" + IDS[index]));
        button(t("Back to services", "सेवामा फर्कनुहोस्"), this::home);
    }
    private void staff() {
        page(t("Staff workspace", "कर्मचारी कार्यक्षेत्र"));
        label(t("Sign in securely using your existing staff passkey. Requests, conversations, quotes and status updates remain in the protected workspace.", "आफ्नो कर्मचारी पासकीबाट सुरक्षित प्रवेश गर्नुहोस्। अनुरोध, सन्देश, शुल्क प्रस्ताव र स्थिति सुरक्षित कार्यक्षेत्रमा रहन्छन्।"), 17, false);
        button(t("Open secure staff sign-in", "सुरक्षित कर्मचारी प्रवेश"), () -> external(BASE + "/admin/login"));
        label(t("Opens your browser for passkey support. No staff credentials are stored in this app.", "पासकी प्रयोगका लागि ब्राउजर खुल्छ। यो एपमा कर्मचारीको प्रवेश विवरण राखिँदैन।"), 14, false);
        button(t("Back to services", "सेवामा फर्कनुहोस्"), this::home);
    }
    private void support() {
        page(t("Here to help", "सहयोगका लागि"));
        label("Butwal, Rupandehi, Nepal\n+977 9867302353", 18, false);
        label(t("Sunday–Friday · 9 AM–6 PM Nepal time", "आइतबार–शुक्रबार · बिहान ९–साँझ ६ बजे"), 16, false);
        button(t("Call Nath", "नाथलाई फोन गर्नुहोस्"), () -> external("tel:+9779867302353"));
        button("WhatsApp", () -> external("https://wa.me/9779867302353"));
        button(t("Read privacy policy", "गोपनीयता नीति"), () -> openPage("/privacy"));
        button(t("Clear saved checklists", "सुरक्षित तयारी सूची मेटाउनुहोस्"), () -> new AlertDialog.Builder(this)
            .setMessage(t("Clear all preparation checklists on this phone? This does not delete submitted requests.", "यो फोनका सबै तयारी सूची मेटाउने? पठाइएका अनुरोध मेटिँदैनन्।"))
            .setPositiveButton(t("Clear", "मेटाउनुहोस्"), (dialog, which) -> {
                prefs.edit().clear().putBoolean("nepali", nepali).apply();
                Toast.makeText(this, t("Checklists cleared", "तयारी सूची मेटाइयो"), Toast.LENGTH_SHORT).show();
            }).setNegativeButton(t("Cancel", "रद्द"), null).show());
        button(t("Back to services", "सेवामा फर्कनुहोस्"), this::home);
    }
    private void openPage(String path) {
        startActivity(new Intent(this, MainActivity.class).putExtra("url", BASE + (nepali ? "/ne" : "") + path));
    }
    private void external(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (android.content.ActivityNotFoundException e) { Toast.makeText(this, t("No app available to open this link", "यो लिङ्क खोल्ने एप उपलब्ध छैन"), Toast.LENGTH_LONG).show(); }
    }
}
