import { Link } from "react-router-dom";
import LegalLayout from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Use"
      lastUpdated="September 9, 2026"
      intro={
        <p>
          These Terms of Use govern your access to and use of{" "}
          <strong>thersvpstudio.com</strong> (the &ldquo;Site&rdquo;), operated by
          The RSVP Studio, a brand of Huna Creatives. By using the Site, you agree to
          these terms. If you do not agree, please do not use the Site.
        </p>
      }
    >
      <div>
        <h2>1. The Site is informational</h2>
        <p>
          The Site presents our services, collections, portfolio, and general
          information. Nothing on the Site is an offer, quote, or commitment to
          provide services on any particular terms. Prices, packages, timelines, and
          availability shown are indicative and may change without notice.
        </p>
      </div>

      <div>
        <h2>2. Client engagements are separate</h2>
        <p>
          Any project we take on is governed by a separate written proposal and
          agreement signed by both parties. Where those documents conflict with these
          Terms of Use, the signed project agreement controls for that engagement.
        </p>
      </div>

      <div>
        <h2>3. Submissions</h2>
        <p>
          When you send us an inquiry, partnership request, or other message, you
          confirm that the information you provide is accurate and that you have the
          right to share it. Please do not send confidential information you do not
          want us to hold. Our handling of personal information is described in our{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>

      <div>
        <h2>4. Intellectual property</h2>
        <p>
          The Site and its content — including text, layouts, graphics, illustrations,
          photography, and the portfolio and collection designs shown — are owned by
          or licensed to The RSVP Studio and are protected by intellectual-property
          laws. You may view and share links to the Site, but you may not copy,
          reproduce, modify, or use our content or designs for your own or a third
          party&rsquo;s commercial purposes without our prior written permission.
        </p>
      </div>

      <div>
        <h2>5. Acceptable use</h2>
        <ul>
          <li>Do not use the Site for any unlawful or fraudulent purpose.</li>
          <li>Do not attempt to disrupt, probe, or gain unauthorised access to the Site or its infrastructure.</li>
          <li>Do not scrape, harvest, or bulk-download content except as permitted by our robots directives.</li>
          <li>Do not misrepresent your affiliation with any person or organisation.</li>
        </ul>
      </div>

      <div>
        <h2>6. Third-party links</h2>
        <p>
          The Site may link to third-party websites and services (for example,
          Instagram, or a payment provider). We are not responsible for their content
          or practices, and your use of them is subject to their own terms.
        </p>
      </div>

      <div>
        <h2>7. Disclaimer</h2>
        <p>
          The Site is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
          without warranties of any kind, whether express or implied, including as to
          accuracy, availability, or fitness for a particular purpose.
        </p>
      </div>

      <div>
        <h2>8. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, The RSVP Studio and Huna Creatives
          will not be liable for any indirect, incidental, special, or consequential
          damages, or for any loss arising from your use of, or inability to use, the
          Site.
        </p>
      </div>

      <div>
        <h2>9. Governing law</h2>
        <p>
          These Terms of Use are governed by the laws of the Republic of the
          Philippines, without regard to its conflict-of-laws rules. The courts of the
          Philippines will have jurisdiction over any dispute relating to the Site,
          subject to any mandatory consumer-protection rights you have where you live.
        </p>
      </div>

      <div>
        <h2>10. Changes</h2>
        <p>
          We may update these Terms of Use from time to time. Changes take effect when
          posted, with a revised &ldquo;Last updated&rdquo; date. Your continued use of
          the Site after changes are posted means you accept them.
        </p>
      </div>

      <div>
        <h2>11. Contact</h2>
        <p>
          The RSVP Studio &middot; a brand of Huna Creatives &middot; Philippines
          <br />
          <a href="mailto:hello@thersvpstudio.com">hello@thersvpstudio.com</a>
        </p>
        <p className="text-xs">
          These terms are provided as a general template and do not constitute legal
          advice. Please have them reviewed by qualified counsel before relying on
          them.
        </p>
      </div>
    </LegalLayout>
  );
}
