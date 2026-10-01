package np.com.nathonline.preview;

import java.net.URI;

final class NavigationPolicy {
    static final String HOME = "https://nath-official-preview.nathservicesnp.workers.dev/services";
    static boolean internal(String url) {
        try {
            URI uri = new URI(url);
            String path = uri.getPath();
            return "https".equals(uri.getScheme())
                && "nath-official-preview.nathservicesnp.workers.dev".equals(uri.getHost())
                && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443)
                && path != null && !path.startsWith("/admin");
        } catch (Exception e) { return false; }
    }
    static boolean external(String url) {
        try {
            URI uri = new URI(url);
            return ("https".equals(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null)
                || "tel".equals(uri.getScheme()) || "mailto".equals(uri.getScheme());
        } catch (Exception e) { return false; }
    }
}
