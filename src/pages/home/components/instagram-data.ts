// Pulled from instagram.com/rsvpstudioo — images mirrored into /public/instagram
// so the grid doesn't depend on Instagram's expiring CDN URLs.
// Refresh: re-render the profile with headless Chrome, re-download post thumbs.

export const IG_PROFILE = {
  handle: "rsvpstudioo",
  url: "https://www.instagram.com/rsvpstudioo/",
  name: "The RSVP Studio",
  avatar: "/instagram/avatar.jpg",
  followers: 57,
  posts: 11,
};

export type IgPost = { img: string; url: string; caption: string };

export const IG_POSTS: IgPost[] = [
  { img: "/instagram/post-01.jpg", url: "https://www.instagram.com/p/DcNg0QYEnqz/", caption: "Custom URL — Atty. Tercel Mercado-Gephart" },
  { img: "/instagram/post-02.jpg", url: "https://www.instagram.com/p/DcDaMPtEmU1/", caption: "Carlo & Trixia — save the date" },
  { img: "/instagram/post-03.jpg", url: "https://www.instagram.com/p/DcDONAFSr7i/", caption: "Monogram wax seal" },
  { img: "/instagram/post-04.jpg", url: "https://www.instagram.com/p/DcApOwOEgM7/", caption: "Claudy's 50th Birthday — Let's Play" },
  { img: "/instagram/post-05.jpg", url: "https://www.instagram.com/p/Db-EV3mEsx4/", caption: "Stationery // Wine Label" },
  { img: "/instagram/post-06.jpg", url: "https://www.instagram.com/p/DbxXXAwEjFc/", caption: "Thamara's Cellar — stationery // wine label" },
  { img: "/instagram/post-07.jpg", url: "https://www.instagram.com/p/Dbuh7mYyrsT/", caption: "Andrew & Emily" },
  { img: "/instagram/post-08.jpg", url: "https://www.instagram.com/p/DbsBR6YSOSP/", caption: "Digital birthday website — she is turning thirty" },
  { img: "/instagram/post-09.jpg", url: "https://www.instagram.com/p/DbpVzeXEgab/", caption: "Gelis 30th Birthday" },
  { img: "/instagram/post-10.jpg", url: "https://www.instagram.com/p/DbhnxqfkkCu/", caption: "More than an invitation — Isabella & Marcus" },
  { img: "/instagram/post-11.jpg", url: "https://www.instagram.com/p/DbfCd1ZEs5J/", caption: "Invitations, reimagined." },
];
