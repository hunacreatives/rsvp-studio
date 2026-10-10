import { Link } from "react-router-dom";
import LegalLayout from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="October 11, 2026"
      intro={
        <p>
          These terms apply when you use <strong>thersvpstudio.com</strong> — browsing the site, creating an
          account, building an event website, working with our studio, or replying to an invitation. The service
          is run by The RSVP Studio, a brand of Huna Creatives, in the Philippines. By using it, you agree to these
          terms.
        </p>
      }
    >
      <div>
        <h2>1. What we offer</h2>
        <ul>
          <li><strong>Studio projects</strong> — event websites, invitations, monograms and stationery we design for you.</li>
          <li><strong>Build Your Website</strong> — a do-it-yourself builder for your own event website, with RSVPs.</li>
          <li><strong>Your dashboard</strong> — your projects, invoices, messages and support requests in one place.</li>
        </ul>
        <p>Prices, packages and timelines on the site are a guide and can change; your quote or the price shown at checkout is what applies.</p>
      </div>

      <div>
        <h2>2. Your account</h2>
        <p>
          Keep your login details private and tell us if you think someone else has used your account. You&rsquo;re
          responsible for what happens in your account. An event can have co-hosts; whoever you give an invite code
          to can see and manage that event.
        </p>
      </div>

      <div>
        <h2>3. Studio projects</h2>
        <p>
          Each studio project follows the proposal and agreement we send you, including its price, deposit, number
          of revisions and timeline. Where those differ from these terms, your project agreement wins for that
          project.
        </p>
      </div>

      <div>
        <h2>4. Building your own website</h2>
        <p>
          You can design and preview your site for free. Publishing a site may have a one-time fee, shown before
          you pay; once paid, you can keep editing, unpublish and publish again without paying again. We keep a
          published site online for the period described in your package or at the time you publish.
        </p>
        <p>
          You&rsquo;re responsible for what you put on your site — make sure you have the right to use your photos,
          words and anything else you upload, and that your guests are happy for you to collect their replies.
        </p>
      </div>

      <div>
        <h2>5. Payments</h2>
        <p>
          Online payments are processed by PayMongo (GCash, Maya, cards and QR Ph); their terms also apply to the
          payment. Your receipt appears in your dashboard once a payment goes through. Studio project refunds and
          cancellations follow your project agreement. A website publishing fee isn&rsquo;t refundable once the site
          has been published, unless the law says otherwise or we&rsquo;re unable to provide the service — in which case
          we&rsquo;ll make it right.
        </p>
      </div>

      <div>
        <h2>6. Fair use</h2>
        <ul>
          <li>Don&rsquo;t use the service for anything unlawful, misleading or harmful, or to send spam.</li>
          <li>Don&rsquo;t upload content that isn&rsquo;t yours to share, or that&rsquo;s offensive or infringes anyone&rsquo;s rights.</li>
          <li>Don&rsquo;t try to break into, overload or copy the service, or other people&rsquo;s events.</li>
        </ul>
        <p>We may take down content or unpublish a site that breaks these rules, and suspend accounts that keep doing so.</p>
      </div>

      <div>
        <h2>7. Ownership</h2>
        <p>
          Your content (names, photos, stories) stays yours; you let us store and show it to run your site and
          dashboard. Our designs, templates, and the site itself belong to us or our licensors. For studio projects,
          what you can use the finished designs for is set out in your project agreement. Please don&rsquo;t copy our
          designs or templates for other uses without permission.
        </p>
      </div>

      <div>
        <h2>8. Guests</h2>
        <p>
          If you&rsquo;re replying to an invitation, your reply goes to the host of that event. How we handle it is
          explained in our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>

      <div>
        <h2>9. Availability and liability</h2>
        <p>
          We work hard to keep the service running, but can&rsquo;t promise it will never be interrupted. To the extent
          the law allows, the service is provided &ldquo;as is&rdquo;, and our total responsibility for any claim is
          limited to the amount you paid us in the 12 months before it. We&rsquo;re not responsible for indirect losses.
          Nothing in these terms limits rights you have under Philippine consumer law.
        </p>
      </div>

      <div>
        <h2>10. Changes and law</h2>
        <p>
          We may update these terms; we&rsquo;ll change the date above and tell account holders about important
          changes. These terms are governed by the laws of the Philippines.
        </p>
      </div>

      <div>
        <h2>11. Contact</h2>
        <p>
          The RSVP Studio &middot; a brand of Huna Creatives &middot; Philippines
          <br />
          <a href="mailto:hello@thersvpstudio.com">hello@thersvpstudio.com</a>
        </p>
      </div>
    </LegalLayout>
  );
}
