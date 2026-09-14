import { Link } from "react-router-dom";
import LegalLayout from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="September 9, 2026"
      intro={
        <p>
          The RSVP Studio (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
          is a digital event design studio operated by Huna Creatives, based in the
          Philippines and serving clients worldwide. This policy explains what
          personal information we collect through <strong>thersvpstudio.com</strong>,
          how we use it, and the choices you have.
        </p>
      }
    >
      <div>
        <h2>1. Information we collect</h2>
        <p>
          <strong>Information you give us.</strong> When you submit an inquiry or
          partner form, you may provide your name, email address, Instagram handle,
          phone or preferred contact, event details (date, location, guest count,
          occasion, celebrant or partner names), your design preferences and vision,
          an indicative budget range, and any other details you choose to include.
        </p>
        <p>
          <strong>Information collected automatically.</strong> Our host (Vercel) and
          the content-delivery networks that serve our fonts and icons (Google Fonts,
          Cloudflare / cdnjs) may automatically log standard technical data such as
          your IP address, browser type, and the pages you request, for security and
          reliability. We do not run analytics, advertising, or behavioural-tracking
          scripts on this site.
        </p>
        <p>
          <strong>Client project information.</strong> If you engage us for a project,
          we will process the information needed to deliver it — which may include
          details about your guests that you provide to us. Our handling of that
          information is governed by our written project agreement with you.
        </p>
      </div>

      <div>
        <h2>2. How we use your information</h2>
        <ul>
          <li>To respond to your inquiry and prepare a proposal or quote.</li>
          <li>To evaluate partnership requests from planners, venues, and studios.</li>
          <li>To deliver, support, and improve services you engage us for.</li>
          <li>To keep the website secure and functioning.</li>
          <li>To comply with legal obligations and enforce our terms.</li>
        </ul>
        <p>
          We do not sell your personal information, and we do not use it for
          third-party advertising.
        </p>
      </div>

      <div>
        <h2>3. Cookies and local storage</h2>
        <p>
          This site does not use tracking or advertising cookies and does not deploy a
          consent banner because none is required for the storage we use. We rely only
          on <strong>strictly necessary / functional browser storage</strong>: a
          language-preference value (<code>i18nextLng</code>) saved in your
          browser&rsquo;s local storage so the site remembers your language. You can
          clear this at any time through your browser settings. If we add analytics or
          marketing tools in the future, we will update this policy and introduce a
          consent mechanism before those tools are activated.
        </p>
      </div>

      <div>
        <h2>4. Who we share information with</h2>
        <p>We share personal information only with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> that operate our infrastructure, such
            as our website host and, where applicable, an email-delivery provider used
            to correspond with you.
          </li>
          <li>
            <strong>Payment channels</strong> you choose to use for client invoices
            (e.g. bank transfer or PayPal), which process payment data under their own
            privacy policies.
          </li>
          <li>
            <strong>Authorities or advisors</strong> where required by law, or to
            establish, exercise, or defend legal claims.
          </li>
        </ul>
      </div>

      <div>
        <h2>5. International transfers</h2>
        <p>
          We are based in the Philippines and our service providers may store or
          process data in other countries. Where required, we rely on appropriate
          safeguards for cross-border transfers.
        </p>
      </div>

      <div>
        <h2>6. Retention</h2>
        <p>
          We keep inquiry and partner submissions for as long as needed to evaluate
          and follow up on them, and for a reasonable period afterward for
          record-keeping. Client project data is retained for the duration of the
          engagement and as set out in the project agreement, then deleted or
          anonymised.
        </p>
      </div>

      <div>
        <h2>7. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct,
          update, delete, or restrict our use of your personal information, to object
          to certain processing, and to withdraw consent. Visitors in the EU/UK have
          rights under the GDPR / UK GDPR; visitors in the Philippines under the Data
          Privacy Act of 2012; and California residents under the CCPA/CPRA. To make a
          request, email us at{" "}
          <a href="mailto:hello@thersvpstudio.com">hello@thersvpstudio.com</a>. We may
          need to verify your identity before acting on a request.
        </p>
      </div>

      <div>
        <h2>8. Children</h2>
        <p>
          This site is intended for adults and is not directed at children. Some
          celebrations we design for involve minors; where a client provides
          information about children to us, the client is responsible for having the
          appropriate authority to do so.
        </p>
      </div>

      <div>
        <h2>9. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. When we do, we will revise the
          &ldquo;Last updated&rdquo; date above, and for material changes we will take
          reasonable steps to notify you.
        </p>
      </div>

      <div>
        <h2>10. Contact</h2>
        <p>
          The RSVP Studio &middot; a brand of Huna Creatives &middot; Philippines
          <br />
          <a href="mailto:hello@thersvpstudio.com">hello@thersvpstudio.com</a>
        </p>
        <p className="text-xs">
          This policy is provided as a general template and does not constitute legal
          advice. Please have it reviewed by qualified counsel and adjusted to your
          actual data practices before relying on it. See also our{" "}
          <Link to="/terms">Terms of Use</Link>.
        </p>
      </div>
    </LegalLayout>
  );
}
