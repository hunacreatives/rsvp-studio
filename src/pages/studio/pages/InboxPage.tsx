import StudioInbox from "../StudioInbox";
import { StudioHeader, useStudio } from "../StudioLayout";

export default function InboxPage() {
  const { owners } = useStudio();
  return (
    <>
      <StudioHeader title="Inbox" sub="Every client conversation and support request." />
      <StudioInbox owners={owners} />
    </>
  );
}
