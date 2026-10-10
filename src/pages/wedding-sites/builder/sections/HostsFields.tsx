import type { EventContent, Person } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle, textareaStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";

interface HostsFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

// Hosts is a LIST, not a fixed pair — works for a couple (2 hosts), a
// single birthday honoree (1 host), joint siblings' birthdays (3+ hosts),
// etc. See Decision log for why this replaced an earlier fixed
// "partnerOne/partnerTwo" shape.
export default function HostsFields({ content, onChange }: HostsFieldsProps) {
  return (
    <div>
      <ListEditor<Person>
        items={content.hosts}
        onChange={(hosts) => onChange({ ...content, hosts })}
        createItem={() => ({ id: createId("host"), name: "" })}
        addLabel="Add a name"
        emptyLabel="Who is this celebration for? Add each name (the couple, or the birthday celebrant)."
        renderItem={(host, update) => (
          <FormField label="Name">
            <input style={inputStyle} value={host.name} onChange={(e) => update({ name: e.target.value })} />
          </FormField>
        )}
      />

      <div style={{ marginTop: 20 }}>
        <FormField label="Your story" hint="A few lines in your own words. Press Enter twice to start a new paragraph.">
          <textarea
            style={{ ...textareaStyle, minHeight: 160 }}
            value={content.story ?? ""}
            onChange={(e) => onChange({ ...content, story: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}
