import { useSearchParams } from "react-router-dom";
import StudioInbox from "../StudioInbox";
import { StudioHeader, useStudio } from "../StudioLayout";

export default function InboxPage() {
  const { owners } = useStudio();
  // Phones: an open conversation gets the whole screen.
  const [params] = useSearchParams();
  return (
    <>
      <StudioHeader title="Inbox" sub="Project conversations with clients. Support requests are under Support." hideOnPhone={!!params.get("thread")} />
      <StudioInbox owners={owners} />
    </>
  );
}
