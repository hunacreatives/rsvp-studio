import { Link } from "react-router-dom";
import LegalLayout from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="October 11, 2026"
      intro={
        <p>
          The RSVP Studio (&ldquo;we,&rdquo; &ldquo;us&rdquo;) is a digital event design studio and a brand of
          Huna Creatives, based in the Philippines. This policy explains what personal information we collect
          through <strong>thersvpstudio.com</strong> — including your account, the event websites you build or
          we build for you, and your guests&rsquo; RSVPs — how we use it, who helps us process it, and your rights
          under the <strong>Data Privacy Act of 2012</strong> (Republic Act No. 10173).
        </p>
      }
    >
      <div>
        <h2>1. What we collect</h2>
        <p>
          <strong>When you contact us.</strong> Inquiry, partner and question forms: your name, email, phone or
          social handle, event details (occasion, date, place, guest count, names of the celebrants), your
          preferences and budget, and any files you attach.
        </p>
        <p>
          <strong>Your account.</strong> Name, email address, password (stored securely by our login provider —
          we never see it), and, if you add them, phone, location, profile photo and billing details (name,
          email and address for receipts). If you sign in with Google, we receive your name, email and profile
          photo from Google.
        </p>
        <p>
          <strong>Your event and website.</strong> The content you add: names, dates, venues, schedule, stories,
          photos, gift and travel details, and your design choices.
        </p>
        <p>
          <strong>Your guests&rsquo; RSVPs.</strong> When guests reply on an event website: their name, an email
          address or mobile number, whether they&rsquo;re coming, how many are coming, food needs, and any message.
        </p>
        <p>
          <strong>Messages and support.</strong> Messages and files you send us in your dashboard or by email,
          your support requests, and your rating of our help. To keep ratings genuine we also record the browser
          and IP address a rating came from.
        </p>
        <p>
          <strong>Payments.</strong> The amount, what it&rsquo;s for, the payment method (e.g. GCash, Maya, card)
          and the payment reference. Card and wallet details are entered on PayMongo&rsquo;s secure page — we
          never receive or store them.
        </p>
        <p>
          <strong>Technical data.</strong> Our hosting and security services log standard data such as IP
          address, browser type and pages requested, to keep the service secure and working. We don&rsquo;t run
          analytics, advertising or tracking scripts.
        </p>
      </div>

      <div>
        <h2>2. How we use it</h2>
        <ul>
          <li>To reply to inquiries, prepare quotes and deliver the projects you engage us for.</li>
          <li>To run your account, your dashboard and your event website, and to show your guest list to you.</li>
          <li>To send the emails the service depends on — RSVP confirmations, invoices and receipts, support replies, reminders and account emails.</li>
          <li>To take payments and keep records required by law.</li>
          <li>To keep the service secure, prevent spam and abuse, and fix problems.</li>
        </ul>
        <p>We do not sell personal information, and we do not use it for advertising.</p>
      </div>

      <div>
        <h2>3. Guests&rsquo; information</h2>
        <p>
          The host of an event decides who to invite and what to do with the RSVP list; we store and process
          guests&rsquo; replies on the host&rsquo;s behalf, and only use them to run that event&rsquo;s website, show
          the replies to the host, and send the guest a confirmation. Guests can ask the host — or us — to see,
          correct or delete their reply. Hosts are responsible for having a good reason to share guests&rsquo; details
          with us.
        </p>
      </div>

      <div>
        <h2>4. Who helps us (service providers)</h2>
        <p>We share personal information only with providers that help run the service, under their own security and privacy commitments:</p>
        <ul>
          <li><strong>Supabase</strong> — database, login and file storage.</li>
          <li><strong>Vercel</strong> — website hosting.</li>
          <li><strong>Resend</strong> — sending and receiving our emails.</li>
          <li><strong>PayMongo</strong> — online payments (GCash, Maya, cards, QR Ph).</li>
          <li><strong>Google</strong> — &ldquo;Sign in with Google&rdquo;, if you use it, and the fonts our pages load.</li>
          <li><strong>Authorities or advisors</strong> — only where the law requires it, or to establish or defend legal claims.</li>
        </ul>
        <p>
          Some of these providers store data outside the Philippines. We use providers with appropriate
          safeguards for cross-border transfers.
        </p>
      </div>

      <div>
        <h2>5. Cookies and browser storage</h2>
        <p>
          We use only what&rsquo;s needed for the site to work: your login session and your &ldquo;remember me&rdquo;
          choice are kept in your browser&rsquo;s storage, and a few small settings (like a dismissed notice) may be
          remembered too. There are no advertising or tracking cookies, so there&rsquo;s no consent banner. You can
          clear this storage anytime in your browser; you&rsquo;ll just need to log in again.
        </p>
      </div>

      <div>
        <h2>6. How long we keep it</h2>
        <p>
          Inquiries: as long as needed to follow up, then a reasonable period for our records. Accounts: while your
          account is open. Event websites and RSVP lists: while the website is online and for a reasonable period
          after the event, so you can still download your guest list — then deleted, or sooner if you ask.
          Payment records: as long as Philippine tax and accounting rules require.
        </p>
      </div>

      <div>
        <h2>7. Your rights</h2>
        <p>
          Under the Data Privacy Act you can ask to be informed about, access, correct, or delete your personal
          information, object to its processing, ask for a copy in a portable format, and withdraw consent you&rsquo;ve
          given. Email us at <a href="mailto:hello@thersvpstudio.com">hello@thersvpstudio.com</a> with the subject
          &ldquo;Data privacy&rdquo;; we may need to confirm it&rsquo;s you before acting. If you&rsquo;re not satisfied
          with our answer, you can complain to the{" "}
          <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer">National Privacy Commission</a>.
          If you live outside the Philippines, you may have similar rights under your local law.
        </p>
      </div>

      <div>
        <h2>8. Keeping it safe</h2>
        <p>
          Accounts are protected by passwords (with optional two-step login), data is sent over encrypted
          connections, and access to the database is limited to what each person needs — customers can only see
          their own events, and only our team can see the Studio. No system is perfectly secure; if a breach ever
          affects you, we&rsquo;ll tell you and the National Privacy Commission as the law requires.
        </p>
      </div>

      <div>
        <h2>9. Children</h2>
        <p>
          Accounts are for adults. Many celebrations are for children (a first birthday, a christening); the parent
          or guardian who creates the event decides what to share about them, and can ask us to remove it anytime.
        </p>
      </div>

      <div>
        <h2>10. Changes to this policy</h2>
        <p>
          If we change this policy, we&rsquo;ll update the date above, and for important changes we&rsquo;ll let account
          holders know by email.
        </p>
      </div>

      <div>
        <h2>11. Contact and Data Protection Officer</h2>
        <p>
          The RSVP Studio &middot; a brand of Huna Creatives &middot; Philippines
          <br />
          Data Protection Officer: <a href="mailto:hello@thersvpstudio.com">hello@thersvpstudio.com</a> (subject &ldquo;Data privacy&rdquo;)
        </p>
        <p>
          See also our <Link to="/terms">Terms of Service</Link>.
        </p>
      </div>
    </LegalLayout>
  );
}
