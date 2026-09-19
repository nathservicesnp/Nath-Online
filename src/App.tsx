import { FormEvent, useEffect, useMemo, useState } from "react";
import { services } from "./data/services";
import { createTrackingId, findDemoRequest, saveDemoRequest, type DemoRequest } from "./lib/requestStore";

type Route = "home" | "services" | "request" | "track" | "about" | "contact" | "privacy";
const routes: Route[] = ["home", "services", "request", "track", "about", "contact", "privacy"];

function routeFromPath(): Route {
  const value = window.location.pathname.replace(/^\//, "").split("/")[0] || "home";
  return routes.includes(value as Route) ? (value as Route) : "home";
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromPath);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (next: Route) => {
    window.history.pushState({}, "", next === "home" ? "/" : `/${next}`);
    setRoute(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <div className="site-shell">
    <header className="topbar">
      <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate("home"); }} aria-label="Nath Online Services home">
        <span className="brand-mark">N</span>
        <span><strong>NATH</strong><small>ONLINE SERVICES</small></span>
      </a>
      <button className="menu-button" aria-expanded={menuOpen} aria-controls="primary-nav" onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
      <nav id="primary-nav" className={menuOpen ? "nav open" : "nav"} aria-label="Primary navigation">
        {(["home", "services", "track", "about", "contact"] as Route[]).map((item) =>
          <a key={item} href={item === "home" ? "/" : `/${item}`} className={route === item ? "active" : ""} onClick={(event) => { event.preventDefault(); navigate(item); }}>{item[0].toUpperCase() + item.slice(1)}</a>
        )}
        <button className="nav-cta" onClick={() => navigate("request")}>Request a service</button>
      </nav>
    </header>
    <main id="main-content">
      {route === "home" && <Home navigate={navigate} />}
      {route === "services" && <Services navigate={navigate} />}
      {route === "request" && <RequestPage navigate={navigate} />}
      {route === "track" && <TrackPage />}
      {route === "about" && <About />}
      {route === "contact" && <Contact />}
      {route === "privacy" && <Privacy />}
    </main>
    <Footer navigate={navigate} />
    <a className="whatsapp" href="https://wa.me/9779867302353?text=Namaste%20Nath%20Online%20Services%2C%20I%20need%20help%20with%20an%20online%20service." target="_blank" rel="noreferrer" aria-label="Contact Nath Online Services on WhatsApp">WhatsApp</a>
  </div>;
}

function Home({ navigate }: { navigate: (route: Route) => void }) {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Serving Butwal and customers across Nepal</p>
        <h1>Online services made <em>simple, safe and personal.</em></h1>
        <p className="lead">Get trusted help with government forms, bills, tickets, banking guidance and education applications—without unnecessary travel or confusing steps.</p>
        <div className="actions"><button className="button primary" onClick={() => navigate("request")}>Request a service</button><button className="button secondary" onClick={() => navigate("track")}>Track your request</button></div>
        <div className="trust-row"><span>✓ Clear pricing before work begins</span><span>✓ Human support</span><span>✓ No surprise fees</span></div>
      </div>
      <aside className="help-card" aria-label="How it works">
        <span className="card-kicker">HOW IT WORKS</span>
        <ol><li><b>Tell us what you need</b><small>Choose a service and share the basic details.</small></li><li><b>We confirm the requirements</b><small>You receive the document list and service charge first.</small></li><li><b>Track until completion</b><small>Follow progress using your secure tracking ID.</small></li></ol>
        <button className="text-link" onClick={() => navigate("services")}>Explore all services →</button>
      </aside>
    </section>
    <section className="section" aria-labelledby="popular-services"><div className="section-heading"><div><p className="eyebrow">ONE PLACE, MANY SOLUTIONS</p><h2 id="popular-services">How can we help?</h2></div><button className="text-link" onClick={() => navigate("services")}>View all services →</button></div><div className="service-grid">{services.map((service) => <article className="service-card" key={service.id}><span className="service-icon">{service.icon}</span><p className="nepali">{service.nepali}</p><h3>{service.title}</h3><p>{service.description}</p><button className="text-link" onClick={() => navigate("request")}>Request this service →</button></article>)}</div></section>
    <section className="assurance"><div><p className="eyebrow light">LOCAL SUPPORT, NATIONAL REACH</p><h2>Real people. Clear steps. Careful handling.</h2><p>We explain what is required, confirm costs before starting, and keep you informed throughout the process.</p></div><dl><div><dt>Sun–Fri</dt><dd>9:00 AM–6:00 PM</dd></div><div><dt>+977 9867302353</dt><dd>Phone & WhatsApp</dd></div><div><dt>Butwal</dt><dd>Serving all Nepal</dd></div></dl></section>
  </>;
}

function Services({ navigate }: { navigate: (route: Route) => void }) {
  return <section className="page section"><p className="eyebrow">OUR SERVICES</p><h1>Practical help for everyday online tasks</h1><p className="lead narrow">Choose a category below. We will confirm requirements, availability and service charges before beginning any work.</p><div className="service-list">{services.map((service) => <article key={service.id}><span className="service-icon">{service.icon}</span><div><p className="nepali">{service.nepali}</p><h2>{service.title}</h2><p>{service.description}</p><ul>{service.examples.map((item) => <li key={item}>{item}</li>)}</ul></div><button className="button secondary" onClick={() => navigate("request")}>Request</button></article>)}</div><div className="notice"><b>Need something else?</b><p>Contact us and we will check whether the service is available. We never assist with fraudulent or illegal applications.</p></div></section>;
}

function RequestPage({ navigate }: { navigate: (route: Route) => void }) {
  const [submitted, setSubmitted] = useState<DemoRequest | null>(null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const request: DemoRequest = { trackingId: createTrackingId(), name: String(data.get("name")), phone: String(data.get("phone")), service: String(data.get("service")), details: String(data.get("details")), status: "Received", createdAt: new Date().toISOString() };
    saveDemoRequest(request); setSubmitted(request);
  };
  if (submitted) return <section className="page section"><div className="success"><span>✓</span><p className="eyebrow">REQUEST RECEIVED</p><h1>Thank you, {submitted.name}.</h1><p>Your demo request has been saved on this device. Keep this tracking ID:</p><strong className="tracking-code">{submitted.trackingId}</strong><p className="small-note">A production request will be sent securely to our team after the backend and privacy controls are connected.</p><button className="button primary" onClick={() => navigate("track")}>Track request</button></div></section>;
  return <section className="page section form-layout"><div><p className="eyebrow">SERVICE REQUEST</p><h1>Tell us what you need</h1><p className="lead narrow">Share only the basic information below. Please do not submit citizenship numbers, passwords, bank PINs or documents at this stage.</p><div className="privacy-note"><b>Privacy first</b><p>Secure document upload will be enabled only after private storage and staff access controls are ready.</p></div></div><form className="request-form" onSubmit={onSubmit}><label>Full name<input name="name" autoComplete="name" required minLength={2} /></label><label>Mobile number<input name="phone" type="tel" autoComplete="tel" required pattern="(?:\+977)?9[678][0-9]{8}" placeholder="98XXXXXXXX" /><small>Nepal mobile number</small></label><label>Service needed<select name="service" required defaultValue=""><option value="" disabled>Select a service</option>{services.map((item) => <option key={item.id}>{item.title}</option>)}</select></label><label>How can we help?<textarea name="details" required minLength={10} maxLength={800} rows={5} placeholder="Briefly describe the help you need. Do not include sensitive information." /></label><label className="check"><input type="checkbox" required /><span>I agree to be contacted about this request and understand that availability and charges will be confirmed before work begins.</span></label><button className="button primary full" type="submit">Submit request</button></form></section>;
}

function TrackPage() {
  const [result, setResult] = useState<DemoRequest | "missing" | null>(null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setResult(findDemoRequest(String(data.get("tracking")), String(data.get("phone"))) || "missing"); };
  return <section className="page section track-layout"><div><p className="eyebrow">REQUEST TRACKING</p><h1>Check your progress</h1><p className="lead narrow">Enter the tracking ID and mobile number used when submitting your request.</p><form className="track-form" onSubmit={onSubmit}><label>Tracking ID<input name="tracking" required placeholder="NOS-YYYYMMDD-0000" /></label><label>Mobile number<input name="phone" type="tel" required placeholder="98XXXXXXXX" /></label><button className="button primary" type="submit">Check status</button></form></div><div className="status-panel">{!result && <><span className="status-icon">◎</span><h2>Your status will appear here</h2><p>This initial version tracks requests saved on this device.</p></>}{result === "missing" && <><span className="status-icon warn">!</span><h2>Request not found</h2><p>Check both entries carefully or contact us at +977 9867302353.</p></>}{result && result !== "missing" && <><span className="status-badge">{result.status}</span><h2>{result.service}</h2><p><b>Tracking ID:</b> {result.trackingId}</p><p><b>Submitted:</b> {new Date(result.createdAt).toLocaleString()}</p><div className="timeline"><span className="complete">Request received</span><span>Requirements review</span><span>Processing</span><span>Completed</span></div></>}</div></section>;
}

function About() { return <section className="page section prose"><p className="eyebrow">ABOUT NATH ONLINE SERVICES</p><h1>Technology should make everyday work easier—not more confusing.</h1><p className="lead">Nath Online Services is based in Butwal, Rupandehi, and supports customers across Nepal with trustworthy, easy-to-understand online assistance.</p><h2>Our promise</h2><div className="value-grid"><article><b>Clear communication</b><p>We explain requirements and next steps in simple language.</p></article><article><b>Careful handling</b><p>Customer information is collected only when needed and handled with care.</p></article><article><b>Honest service</b><p>Availability and charges are confirmed before any service is performed.</p></article><article><b>Lawful assistance</b><p>We do not support fake documents, fraud or unlawful activity.</p></article></div></section>; }
function Contact() { return <section className="page section contact-layout"><div><p className="eyebrow">CONTACT US</p><h1>Let’s solve it together.</h1><p className="lead narrow">For questions, urgent help or a service not listed on the website, contact our Founder directly.</p><a className="button primary inline" href="https://wa.me/9779867302353" target="_blank" rel="noreferrer">Message on WhatsApp</a></div><div className="contact-card"><div><span>Phone & WhatsApp</span><a href="tel:+9779867302353">+977 9867302353</a></div><div><span>Location</span><b>Butwal, Rupandehi, Lumbini, Nepal</b></div><div><span>Working hours</span><b>Sunday–Friday, 9:00 AM–6:00 PM</b><small>Closed Saturday</small></div></div></section>; }
function Privacy() { return <section className="page section prose"><p className="eyebrow">PRIVACY</p><h1>Privacy information</h1><p>This initial website prototype stores demonstration requests only in the visitor’s browser. It does not send submitted information to Nath Online Services.</p><h2>Before production launch</h2><p>A complete privacy notice will explain what information is collected, why it is needed, how long it is kept, who may access it, and how customers may request correction or deletion. Sensitive documents will use private encrypted storage with controlled, time-limited access.</p><h2>Safety</h2><p>Never share passwords, OTP codes, bank PINs or unnecessary sensitive information through public messages or forms.</p></section>; }

function Footer({ navigate }: { navigate: (route: Route) => void }) { return <footer><div className="footer-brand"><span className="brand-mark">N</span><div><b>Nath Online Services</b><p>All Services, One Place</p></div></div><div><b>Quick links</b>{(["services", "request", "track", "privacy"] as Route[]).map((item) => <button key={item} onClick={() => navigate(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><div><b>Contact</b><a href="tel:+9779867302353">+977 9867302353</a><span>Butwal, Rupandehi, Nepal</span><span>Sun–Fri · 9 AM–6 PM</span></div><p className="copyright">© {new Date().getFullYear()} Nath Online Services. All rights reserved.</p></footer>; }
