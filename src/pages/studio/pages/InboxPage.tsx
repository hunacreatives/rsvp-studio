import StudioInbox from "../StudioInbox";
import { StudioHeader, useStudio } from "../StudioLayout";

export default function InboxPage() {
  const { owners } = useStudio();
  return (
    <>
      <StudioHeader title="Inbox" sub="Project conversations with clients. Support requests are under Support." />
      <StudioInbox owners={owners} />
    </>
  );
}
