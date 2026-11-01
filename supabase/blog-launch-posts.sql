-- RSVP Studio — the first five Journal posts (/blog), published.
-- ADDITIVE, safe to re-run (each post is matched by its slug and updated).
-- Run on LIVE right after pushing the code: the covers are in public/blog/ and the Journal links come
-- back with that push. "wedding-invitation-wording" was one of the four drafts from blog.sql; this
-- writes it. The other three drafts stay drafts.

-- The search fields from blog-seo.sql, in case that one hasn't been run.
alter table blog_posts add column if not exists seo_title text;
alter table blog_posts add column if not exists seo_description text;
alter table blog_posts add column if not exists focus_keyword text;

insert into blog_posts (slug, title, excerpt, body, category, cover_url, cover_alt, author, featured, status, published_at, seo_title, seo_description, focus_keyword) values

-- 1 ------------------------------------------------------------------------------------------------
('wedding-invitation-wording',
 'Wedding Invitation Wording for Filipino Weddings, With Examples',
 'What to include, how to word it formally or casually, and how to list your principal sponsors and entourage without a single name out of place.',
$md$Your invitation is the first thing guests hold of your wedding, and the wording does most of the work. It tells them who is hosting, how formal the day will be, and what you need from them. Here is what to include, with wording you can copy and make your own.

## What every wedding invitation should include

Keep the invitation itself to the essentials, in this order:

1. **The hosts:** your families, your parents, or the two of you.
2. **Your names:** full names for a formal invitation, first names for a relaxed one.
3. **The request line:** the sentence that asks guests to come.
4. **The date and time:** written out in words on formal invitations.
5. **The ceremony venue,** and the reception venue if it's somewhere else.
6. **How and when to reply.**

The dress code, your motif, gifts, the program and directions are better on a details card or on [your wedding website](/blog/how-to-make-a-wedding-website). An invitation crowded with details is harder to read and easier to get wrong.

![A formal wedding invitation with the date written out and a reply-by line](/blog/wedding-invitation-wording/formal-wedding-invitation-wording.webp)

## Formal wedding invitation wording

For a church ceremony, the traditional request line is "the honour of your presence". For a civil ceremony or the reception, "the pleasure of your company" is the usual choice.

When your families are hosting together:

> Together with their families, Isabel Marie Santos and Rafael Antonio Cruz request the honour of your presence at the celebration of their marriage on Saturday, the twelfth of February, two thousand twenty-eight, at three o'clock in the afternoon. San Agustin Church, Intramuros, Manila. Reception to follow at The Manila Hotel.

When both sets of parents are hosting:

> Mr. and Mrs. Eduardo Santos and Mr. and Mrs. Ramon Cruz request the honour of your presence at the marriage of their children, Isabel Marie and Rafael Antonio...

Write the date and time in words, and spell out "o'clock". Formal invitations don't use abbreviations, apart from Mr., Mrs. and Dr.

!["Together with their families": the most common hosts line on Filipino wedding invitations](/blog/wedding-invitation-wording/together-with-their-families-invitation.webp)

## Relaxed wedding invitation wording

If your day is a garden party or a beach wedding, the wording can sound like you:

> We're getting married. Join us for a day of good food, family and a lot of dancing on Saturday, June 21, 2028, 4:00 PM at Villa Aurelia, Tagaytay.

Relaxed doesn't mean vague. Guests still need the date, time, place and how to reply.

## How to list principal sponsors and the entourage

Filipino invitations traditionally name the people who stand with you: your principal sponsors (ninong and ninang), your secondary sponsors and your entourage. On a printed suite they usually go on a separate card or the inside page.

- **Principal sponsors:** list married couples together, as "Mr. & Mrs. Benjamin Saldaña". Families usually order them by seniority, or alternate between the bride's and groom's sides.
- **Secondary sponsors:** group them by role, such as candle, veil and cord, with each pair together.
- **Entourage:** best man and maid or matron of honour first, then bridesmaids and groomsmen, then the bearers and flower girls.

![Principal sponsors, secondary sponsors and the entourage listed on a wedding website (the Capiz design)](/blog/wedding-invitation-wording/principal-sponsors-entourage-list.webp)

Ask each family to check the spelling of every name before anything goes to print. It's the most common mistake on wedding invitations, and the hardest to fix once printed. On a wedding website, a misspelled name takes seconds to correct, and you can list everyone under Entourage & motif with your motif colours.

## RSVP wording

Give a clear deadline and one way to reply:

> Kindly reply by the first of March so we can finalise our numbers.

If seats are limited, say so gently:

> We have reserved two seats in your honour.

Ask guests to reply in one place, not by text, Messenger and a call to your mother. Our guide to [tracking wedding RSVPs](/blog/how-to-track-wedding-rsvps) covers how to keep every reply in one list.

## Dress code and motif

> Formal. Gentlemen in barong or suits, ladies in long gowns. Our motif: sage and champagne.

Name colours guests can actually find in a shop. "Dusty rose" works better than a paint swatch number.

## Gift wording

Most couples in the Philippines now prefer cash gifts, and a kind line makes that easy to say:

> Your presence is the greatest gift. Should you wish to bless us further, a contribution toward our first home would be warmly appreciated.

On an RSVP Studio website you can add your GCash or bank QR code under Gifts, so guests can scan it straight from the page.

## Frequently asked questions

### What do you write on a wedding invitation?

The hosts, your names, a request line, the date and time, the venue, and how and when to reply. The dress code, gifts and program fit better on a details card or your wedding website.

### Do principal sponsors go on the wedding invitation?

On Filipino invitations, traditionally yes, usually on a separate card or the inside page. List married couples together and order them by seniority, or alternate between the bride's and groom's sides.

### When should wedding invitations be sent?

Most couples send them six to eight weeks before the wedding, and earlier for guests who need to travel. A Save the Date goes out months before that.

### Is it okay to ask for cash gifts?

Yes. Keep the line kind and short, and put it on a details card or your website instead of the main invitation.

## Putting it all together

Once your wording is ready, you have two ways to use it:

- **Make your own wedding website for free.** [Pick a design](/build), add your wording and entourage, and share one link. Our [Simbahan design](/build/preview/simbahan) is made for church weddings.
- **Have us design it with you.** We design [printed invitation suites](/services/stationery), [digital Save the Dates](/services/save-the-date) and [monograms](/services/monogram), and we'll help with the wording too. [Tell us about your wedding](/enquire?service=stationery#start) and we'll reply within one business day.
$md$,
 'Wedding', 'https://thersvpstudio.com/blog/wedding-invitation-wording.jpg', 'A formal wedding invitation for Isabel and Rafael in front of a candlelit church aisle', 'The RSVP Studio', true, 'published', now() - interval '4 hours',
 'Wedding Invitation Wording: Examples for Filipino Weddings',
 'What to write on your wedding invitation, with formal and casual examples, RSVP and gift lines, and how to list principal sponsors and the entourage.',
 'wedding invitation wording'),

-- 2 ------------------------------------------------------------------------------------------------
('how-to-make-a-wedding-website',
 'How to Make a Wedding Website in the Philippines, Step by Step',
 'What to put on it, how to build it for free in an afternoon, and when it makes sense to have one made for you.',
$md$A wedding website gives every guest one link for everything: the date, the venue, the dress code, the program and the RSVP. When something changes, you update one page instead of resending a message to two hundred people. Here's how to make one, and what to put on it.

## Why have a wedding website

![Choosing a wedding website design on The RSVP Studio, with free and Premium designs](/blog/how-to-make-a-wedding-website/choose-a-wedding-website-design.webp)

- **One link for every detail.** Guests stop asking you for the venue address the week of the wedding.
- **RSVPs in one list.** Replies come in through a form, not across Messenger, Viber and texts.
- **Easy updates.** A new call time or a change of venue reaches everyone at once.
- **Room for everything the invitation can't fit:** your entourage, your story, directions and gift details.

## What to put on your wedding website

You don't need every section. Pick the ones your guests will actually use:

- Your names, the date and a countdown
- The program, from the ceremony to the send-off
- The venue, with a map and parking notes
- Dress code and motif colours
- Principal sponsors and the entourage
- Where to stay and how to get there, for guests from out of town
- Gifts, with your GCash or bank QR code
- FAQs: can I bring my kids, is there parking, what time should I arrive
- The RSVP form, with a deadline

Not sure what to write? Our [wedding invitation wording guide](/blog/wedding-invitation-wording) has lines you can copy for the invitation, RSVP, dress code and gifts.

![The entourage and principal sponsors on a wedding website, on a phone](/blog/how-to-make-a-wedding-website/wedding-website-entourage-on-phone.webp)

## How to make a wedding website, step by step

1. **Pick a design.** [Browse the designs](/build) and open any of them to see it full-screen with sample details. Free and Premium designs are marked.
2. **Tell us about your wedding.** Your names, the date and the venue go straight onto the site, so you start with real details instead of a blank page.
3. **Fill in your sections.** The builder shows a live preview as you type. Hide any section you don't need.
4. **Set up your RSVP.** Add a reply-by date and your own questions, like meal choices or song requests. Free websites get one question and Premium websites get up to five.
5. **Decide who can see it.** Every website, free or Premium, can ask guests for a password before they open it.
6. **Publish and share.** Your site stays a private draft until you publish it. Then copy your link and send it with your invitation.

Most couples finish a first version in an afternoon, then add the program and entourage as the wedding gets closer.

![Simbahan, a church wedding website design that opens inside a candlelit church](/blog/how-to-make-a-wedding-website/church-wedding-website-design.webp)

## Free or Premium?

A free website includes any free design, the RSVP form with a deadline, a confirmation email for every guest who replies, an invite list that shows who hasn't replied, and one email a day with your new RSVPs. It stays online until 30 days after your wedding.

Premium is a one-time fee per website. It adds:

- an email the moment each guest replies
- confirmation emails sent in your names
- a reminder email to guests two days before
- a page where guests share their photos from the day
- a "find your table" page for the reception
- all Premium designs
- your website online for a year after the wedding

You can start free and upgrade anytime from the builder. The [FAQ](/faqs) has the current price.

## Your own web address

Every website gets a link on thersvpstudio.com. If you'd like your own, like isabelandrafael.com, you can add one from ₱1,499 a year.

## When to share your website

Many couples share their website with their Save the Date, so guests can book flights and leave early, then send the formal invitation with the RSVP deadline. If you're planning a destination wedding, give guests more notice than you think they need.

## Frequently asked questions

### Is a wedding website free?

On The RSVP Studio, yes. You can design, preview and publish a wedding website with any free design, with an RSVP form and confirmation emails included. Premium is a one-time fee per website for extras like instant reply emails and guest photo sharing.

### What should a wedding website include?

Your names and date, the program, the venue with a map, the dress code, your entourage, gifts, FAQs and an RSVP form with a deadline. Add travel and accommodation details if guests are coming from out of town.

### Can I password-protect my wedding website?

Yes. Every RSVP Studio website, free or Premium, can ask guests for a password before they open it.

### How long does a wedding website stay online?

A free website stays online until 30 days after your wedding, and a Premium website for a year after it.

## Rather have it made for you?

If you'd rather not build it yourself, we make [wedding websites](/services/milestone) for you:

- **Semi-Custom, from ₱3,000:** one of our designs with your details and photos, ready in 5 to 7 business days.
- **Custom, from ₱8,000:** designed around your wedding, with three rounds of changes, a free .com or .net for the first year, and we follow up with guests who haven't replied.

[Get a quote for your wedding website](/enquire?service=website#start), or [start building your own for free](/build).
$md$,
 'Planning', 'https://thersvpstudio.com/blog/how-to-make-a-wedding-website.jpg', 'A wedding website for Isabella and Mateo with a countdown and an RSVP button', 'The RSVP Studio', false, 'published', now() - interval '3 hours',
 'How to Make a Wedding Website in the Philippines (Free)',
 'Make a wedding website in an afternoon: what to include, how to build it for free step by step, free vs Premium, and when to have one made for you.',
 'how to make a wedding website'),

-- 3 ------------------------------------------------------------------------------------------------
('how-to-track-wedding-rsvps',
 'How to Track Wedding RSVPs Without Chasing Every Guest',
 'Set a deadline, give guests one place to reply, and always know who hasn''t answered. A practical system for Filipino weddings.',
$md$Ask any couple what the most stressful part of wedding planning was, and RSVPs come up quickly. Replies arrive by text, Messenger, Viber and a call to your mother. Someone says yes for a family of five. The caterer needs a number on Friday. Here's a simple system that keeps every reply in one list.

## Why wedding RSVPs get messy

Most RSVP problems come from three things: replies scattered across apps, no clear deadline, and no list of who was invited in the first place. Fix those three and the rest gets much easier.

## 1. Set an RSVP deadline

Pick a reply-by date about three to four weeks before the wedding. That gives you time to follow up, give your caterer a final count and finish the seating plan. Put the date on the invitation and on the RSVP form itself:

> Kindly reply by the first of March so we can finalise our numbers.

![A wedding invitation with the RSVP deadline printed under the venue](/blog/how-to-track-wedding-rsvps/rsvp-deadline-on-wedding-invitation.webp)

## 2. Give guests one place to reply

Choose one way to reply and put it everywhere. A wedding website RSVP form works well because guests can reply in under a minute, from any phone, at any time.

On an RSVP Studio website, every guest who replies gets a confirmation email, so they know their answer arrived. You see every reply in your Guests tab as soon as it comes in.

![A wedding RSVP form on a phone: name, accepts or declines, email and a note for the couple](/blog/how-to-track-wedding-rsvps/wedding-rsvp-form-on-phone.webp)

## 3. Keep an invite list

A guest list tells you who replied. An invite list tells you who hasn't, which is the list you actually need in the last two weeks.

Paste your guest list into the Guests tab, straight from a spreadsheet or your notes. Each guest gets their own personal link, so their reply is matched to their name, even if they type it differently. As replies come in, the list shows who has answered and who hasn't.

## 4. Decide how many seats each guest gets

Plus-ones cause more seating headaches than anything else. Decide early:

- Name every guest you're inviting, including children.
- Tell guests how many seats are reserved for them: "We have reserved two seats in your honour."
- On Premium, each guest's personal link sets the most seats they can reply for, and you can let only guests with a personal link reply.

## 5. Ask only what you need

Every extra question makes a guest more likely to leave the form for later. Ask what your caterer and coordinator need, like meal choices or dietary restrictions, and skip the rest. A free website can ask one question of your own and a Premium website up to five.

## 6. Follow up, kindly

A week before your deadline, open your invite list and look at who hasn't replied. The Guests tab has a reminder message you can copy and send by text or Messenger. Most late replies are people who meant to answer and forgot.

## 7. Send the final count

After the deadline, export your guest list as a CSV for your caterer and coordinator. Then you're ready to [make your seating chart](/blog/wedding-seating-chart).

## Frequently asked questions

### When should the RSVP deadline be for a wedding?

About three to four weeks before the wedding. That leaves time to follow up, give your caterer a final count and finish the seating plan.

### What if guests don't RSVP by the deadline?

Send a short, personal reminder. Most late replies are people who meant to answer and forgot. An invite list shows exactly who to message.

### Can I use a Google Form for wedding RSVPs?

You can, but a form only lists the people who replied. You still need your own invite list to see who hasn't, and guests don't get a confirmation that their reply arrived.

### How do I stop guests from bringing extra people?

Name everyone you're inviting, tell each guest how many seats are reserved for them, and use personal RSVP links that cap the number of seats.

## Let us handle the follow-ups

[RSVP management](/services/rsvp) is free with every RSVP Studio website, whether you build it yourself or we make it for you. With a [Custom wedding website](/services/milestone), we also follow up with guests who haven't replied and send you the headcount, so you don't have to chase anyone.

[Make your wedding website for free](/build), or [ask us about RSVP management](/enquire?service=rsvp#start). For the invitation itself, see our [wedding invitation wording guide](/blog/wedding-invitation-wording).
$md$,
 'Planning', 'https://thersvpstudio.com/blog/how-to-track-wedding-rsvps.jpg', 'A wedding invitation for Andrea and Miguel in Intramuros, Manila', 'The RSVP Studio', false, 'published', now() - interval '2 hours',
 'How to Track Wedding RSVPs (Without Chasing Guests)',
 'A simple wedding RSVP system: set a deadline, use one reply form, keep an invite list, follow up kindly and send your caterer a final headcount.',
 'wedding RSVP'),

-- 4 ------------------------------------------------------------------------------------------------
('debut-planning-checklist',
 'Debut Planning Checklist: Timeline, 18 Roses and 18 Candles',
 'A month-by-month checklist for an 18th birthday debut, with the traditions explained and what to send guests.',
$md$A debut is part birthday party, part formal ball, with traditions that need people, rehearsals and a program. Here's a checklist that works backwards from the day, plus the 18s explained.

## The debut traditions

- **18 Roses:** eighteen men, usually family and close friends, each dance with the debutante and give her a rose. Her father traditionally has the first or the last dance.
- **18 Candles:** eighteen women each light a candle and share a wish or a memory.
- **18 Treasures:** eighteen guests each give a meaningful gift, often with a short message.
- **The cotillion:** a formal dance with the debutante and a group of friends, rehearsed for weeks.

Some families add their own 18s, like 18 bills or 18 shots. Keep the program to what matters to you. Each 18 adds time, and the dinner has to fit in somewhere.

![The 18 Roses list on a debut website (the Debut design)](/blog/debut-planning-checklist/18-roses-list-debut-website.webp)

## 6 to 12 months before

- Set your budget and a rough guest count.
- Choose the date and book the venue.
- Pick a theme or motif colours.
- Book a coordinator if you're having one.
- Book the caterer, photographer and videographer, and hair and makeup.

## 4 to 6 months before

- Choose your gown, and a second look if you're changing for the party.
- Write down your 18 Roses, 18 Candles and 18 Treasures, and ask each person.
- Choose your cotillion dancers and book a choreographer.
- Send your Save the Date if many guests are travelling.

## 2 to 3 months before

- Send your invitations, with an RSVP deadline.
- Start cotillion rehearsals.
- Plan the program with your host or emcee.

A debut website keeps it all in one place: the program, the dress code, the lists of your 18s and the RSVP form. Our [Debut design](/build/preview/debut) is free, and [Debut Issue](/build/preview/debut-issue) turns your night into a magazine cover. Guests reply on the site and you see every answer in one list.

![A debut invitation for an 18th birthday, with the time, date and venue](/blog/debut-planning-checklist/debut-invitation-18th-birthday.webp)

![Debut Issue: a magazine-style debut website with a letter from the debutante and the night's contents](/blog/debut-planning-checklist/debut-program-magazine-style.webp)

## 1 month before

- Close RSVPs and follow up with anyone who hasn't replied. Our guide to [tracking RSVPs](/blog/how-to-track-wedding-rsvps) works the same way for debuts.
- Confirm every 18 Roses, Candles and Treasures participant, and tell them their cue.
- Final gown fitting.

## 1 to 2 weeks before

- Give your caterer the final headcount.
- Finish the seating plan. Seat your 18s near the stage so they can get up quickly when they're called. [Mesa](/tools/seating-chart-maker), our free seating chart maker, works for debuts too.
- Print an alphabetical guest list for the entrance.
- Send your coordinator the final program.

## On the day

A common order: the debutante's entrance, a prayer, welcome remarks, dinner, the cotillion, 18 Candles, 18 Treasures, 18 Roses ending with her father, then the party. Ask your emcee to keep each 18 moving. A long program is the usual reason debuts run late.

## Frequently asked questions

### What is the order of a debut program?

A common order is the debutante's entrance, a prayer, welcome remarks, dinner, the cotillion, 18 Candles, 18 Treasures, then 18 Roses ending with her father, and the party.

### Who are the 18 Roses?

Eighteen men who matter to the debutante, usually family and close friends. Each dances with her and gives her a rose, and her father traditionally has the first or the last dance.

### What is the difference between 18 Candles and 18 Treasures?

18 Candles are eighteen women who each light a candle and share a wish or a memory. 18 Treasures are eighteen guests who each give a meaningful gift, often with a short message.

### When should debut invitations be sent?

Two to three months before the debut, with an RSVP deadline about a month before, so you can confirm your 18s and give the caterer a final count.

## Make your debut invitation

- **Build your own debut website for free.** [Start with a design](/build), add the program and your 18s, and share one link.
- **Have us make it for you.** We design [custom event websites](/services/milestone), [monograms](/services/monogram) and [digital Save the Dates](/services/save-the-date). [Tell us about your debut](/enquire?service=website#start) and we'll reply within one business day.
$md$,
 'Debut', 'https://thersvpstudio.com/blog/debut-planning-checklist.jpg', 'An 18th birthday debut invitation for Sofia Isabel Reyes in a wine-coloured envelope', 'The RSVP Studio', false, 'published', now() - interval '1 hour',
 'Debut Planning Checklist: Timeline, 18 Roses & 18 Candles',
 'Plan an 18th birthday debut month by month: 18 Roses, 18 Candles and 18 Treasures explained, the program order, invitations, RSVPs and seating.',
 'debut planning checklist'),

-- 5 ------------------------------------------------------------------------------------------------
('wedding-seating-chart',
 'How to Make a Wedding Seating Chart for a Filipino Reception',
 'Who sits at the presidential table, where the sponsors go, how many tables you need, and a free tool to plan it.',
$md$The seating chart is usually the last big job before the wedding, and the one with the most opinions attached. Here's how to plan one for a Filipino reception, from the presidential table to the back row.

## Start after your RSVP deadline

Don't seat anyone until your replies are in. Plan to finish the seating chart two to three weeks before the wedding, after your RSVP deadline, so your coordinator and caterer get the final lists in time. If replies are still trickling in, see our guide to [tracking wedding RSVPs](/blog/how-to-track-wedding-rsvps).

## Where everyone sits

A traditional Filipino reception follows a familiar layout:

- **Presidential table:** the couple and both sets of parents, in front of the stage and facing the guests. Some couples add grandparents.
- **Principal sponsors:** at the tables right beside the presidential table, married pairs together. Six to twelve pairs usually need two tables.
- **Secondary sponsors and the entourage:** near the front. Cord, veil, coin and candle sponsors can share a table, and the entourage takes one or two.
- **Family:** the bride's guests on one side of the dance floor and the groom's on the other.
- **Everyone else:** friends, officemates and church friends further back, each group at its own tables.

Seat lolos and lolas away from the speakers, and close to the restrooms if you can.

## How many tables do you need?

Most reception rounds seat ten: a 60-inch round seats eight and a 72-inch round seats ten. Lauriat-style receptions often use rounds of twelve.

To count tables, divide your guest count by ten, then add the presidential, sponsors' and entourage tables, plus one spare for late replies. Ask your venue which table sizes they have before you start.

## How to make your seating chart

You can do this with paper and sticky notes, but a seating chart maker saves hours when someone changes their mind. [Mesa](/tools/seating-chart-maker) is our free seating chart maker, and you can start without signing up:

1. **Paste your guest list.** Copy it from Viber, Notes or Excel. "Tito Ben & Tita Marie + 2 kids" stays together as one family.
2. **Seat everyone.** Mesa seats sponsors beside the presidential table, the bride's guests on one side and the groom's on the other. Drag anyone to change it.
3. **Print or share.** Download the floor plan, an alphabetical list for the entrance and table lists for your caterer, or send your coordinator a link.

There's no guest limit, and it works on your phone. Downloads and share links need a free account.

![Mesa, a free seating chart maker for weddings and debuts, on a laptop and a phone](/blog/wedding-seating-chart/free-seating-chart-maker-mesa.webp)

## Help guests find their table

Print the alphabetical list for the entrance, so guests can find their name quickly. If you have an RSVP Studio website on Premium, you can also turn on "find your table" so guests type their name and see their table on their phone.

## Common seating mistakes

- **Seating before replies are in.** You'll redo the chart twice.
- **Splitting families.** Keep households together, even when the numbers don't come out even.
- **Forgetting the suppliers.** Your photographer, videographer and coordinator need a table or meals too. Ask your caterer.
- **Not telling your coordinator.** Send them the final chart, and tell them who to watch out for.

## Frequently asked questions

### How many guests fit at a round table?

Usually ten. A 60-inch round seats eight and a 72-inch round seats ten. Lauriat receptions often use rounds of twelve.

### Who sits at the presidential table?

The couple and both sets of parents. Some couples add grandparents. Principal sponsors sit at the tables beside it.

### When should the seating chart be finished?

Two to three weeks before the wedding, after your RSVP deadline, so your coordinator and caterer have the final lists.

### Is there a free wedding seating chart maker?

Yes. [Mesa](/tools/seating-chart-maker) is free, with no guest limit, and you can start without signing up.

## Planning a wedding for your clients?

Coordinators use Mesa for every client's reception, and our [coordinator program](/partners) keeps every event in one dashboard. For couples, [make your wedding website for free](/build) and keep your RSVPs, invite list and seating in one place.
$md$,
 'Planning', 'https://thersvpstudio.com/blog/wedding-seating-chart.jpg', 'A wedding reception seating chart in Mesa with a presidential table and round tables', 'The RSVP Studio', false, 'published', now(),
 'Wedding Seating Chart: How to Plan a Filipino Reception',
 'Plan your wedding seating chart: who sits at the presidential table, where sponsors go, how many tables you need, and a free seating chart maker.',
 'wedding seating chart')

on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body, category = excluded.category,
  cover_url = excluded.cover_url, cover_alt = excluded.cover_alt, featured = excluded.featured,
  status = excluded.status, published_at = coalesce(blog_posts.published_at, excluded.published_at),
  seo_title = excluded.seo_title, seo_description = excluded.seo_description, focus_keyword = excluded.focus_keyword,
  updated_at = now();

-- Only one featured post: the wording guide.
update blog_posts set featured = false where featured and slug <> 'wedding-invitation-wording';

-- Check:
select slug, status, featured, published_at from blog_posts order by published_at desc nulls last;
