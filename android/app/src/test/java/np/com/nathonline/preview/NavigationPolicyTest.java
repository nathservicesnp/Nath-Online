package np.com.nathonline.preview;
import org.junit.Test;
import static org.junit.Assert.*;
public class NavigationPolicyTest {
    @Test public void keepsPreviewPagesInside() {
        assertTrue(NavigationPolicy.internal(NavigationPolicy.HOME));
        assertTrue(NavigationPolicy.internal(NavigationPolicy.HOME.replace("/services", "/request?service=business-pan")));
    }
    @Test public void rejectsUntrustedAndStaffPages() {
        for (String url : new String[]{"http://nath-official-preview.nathservicesnp.workers.dev/services", "https://nath-official-preview.nathservicesnp.workers.dev.evil.com", "file:///etc/passwd", "javascript:alert(1)", NavigationPolicy.HOME.replace("/services", "/admin"), "https://user@nath-official-preview.nathservicesnp.workers.dev/"}) assertFalse(url, NavigationPolicy.internal(url));
    }
    @Test public void onlyAllowsSafeExternalSchemes() {
        assertTrue(NavigationPolicy.external("tel:+9779867302353"));
        assertTrue(NavigationPolicy.external("https://www.nathonline.com.np"));
        assertFalse(NavigationPolicy.external("intent://anything"));
        assertFalse(NavigationPolicy.external("javascript:alert(1)"));
        assertFalse(NavigationPolicy.external("http://example.com"));
    }
}
