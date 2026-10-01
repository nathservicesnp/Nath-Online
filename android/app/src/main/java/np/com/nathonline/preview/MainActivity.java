package np.com.nathonline.preview;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.webkit.*;
import android.widget.*;

public class MainActivity extends Activity {
    private WebView web;
    private TextView status;
    private String retryUrl = NavigationPolicy.HOME;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        TextView title = new TextView(this);
        title.setText("Nath Preview · Test requests only");
        title.setTextSize(17);
        title.setTextColor(Color.WHITE);
        title.setBackgroundColor(Color.rgb(18, 62, 57));
        title.setPadding(20, 16, 20, 16);
        root.addView(title);
        LinearLayout toolbar = new LinearLayout(this);
        addButton(toolbar, "Services", () -> web.loadUrl(NavigationPolicy.HOME));
        addButton(toolbar, "Retry", () -> web.loadUrl(retryUrl));
        addButton(toolbar, "Browser", () -> openExternal(retryUrl));
        root.addView(toolbar);
        status = new TextView(this);
        status.setPadding(20, 8, 20, 8);
        root.addView(status);
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (NavigationPolicy.internal(url)) return false;
                if (request.isForMainFrame()) openExternal(url);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                if (NavigationPolicy.internal(url)) retryUrl = url;
                status.setText("Loading…");
                status.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                if ("Loading…".contentEquals(status.getText())) status.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame()) showError();
            }
        });
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        String startUrl = getIntent().getStringExtra("url");
        web.loadUrl(NavigationPolicy.internal(startUrl) ? startUrl : NavigationPolicy.HOME);
    }
    private void addButton(LinearLayout row, String text, Runnable action) {
        Button button = new Button(this);
        button.setText(text);
        button.setOnClickListener(v -> action.run());
        row.addView(button, new LinearLayout.LayoutParams(0, -2, 1));
    }
    private void showError() {
        status.setText("Unable to load. Check your internet connection, then tap Retry.");
        status.setVisibility(View.VISIBLE);
    }
    private void openExternal(String url) {
        if (!NavigationPolicy.external(url)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (android.content.ActivityNotFoundException e) {
            Toast.makeText(this, "No app is available to open this link.", Toast.LENGTH_LONG).show();
        }
    }
    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
