import { useSearchParams } from "react-router-dom";
import StudioInbox from "../StudioInbox";
import { StudioHeader, useStudio } from "../StudioLayout";

export default function InboxPage() {
  const { owners } = useStudio();
  // Phones: an open conversation gets the whole screen.
  const [params] = useSearchParams();
  return (
    <>
      <StudioHeader title="Messages" sub="Conversations with clients about their projects." tabs="messages" hideOnPhone={!!params.get("thread")} />
      <StudioInbox owners={owners} />
    </>
  );
}
