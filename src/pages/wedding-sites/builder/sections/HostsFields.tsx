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
        addLabel="Add host"
        emptyLabel="Add at least one host (e.g. the couple, or the birthday honoree)."
        renderItem={(host, update) => (
          <FormField label="Name">
            <input style={inputStyle} value={host.name} onChange={(e) => update({ name: e.target.value })} />
          </FormField>
        )}
      />

      <div style={{ marginTop: 20 }}>
        <FormField label="Story" hint="Separate paragraphs with a blank line.">
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
