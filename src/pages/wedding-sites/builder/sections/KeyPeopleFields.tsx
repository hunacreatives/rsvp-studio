import type { EventContent, Person } from "../../content/types";
import { FormField, inputStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";
import { LISTS } from "../pageEdit";

interface KeyPeopleFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

export default function KeyPeopleFields({ content, onChange }: KeyPeopleFieldsProps) {
  return (
    <ListEditor<Person>
      items={content.keyPeople}
      onChange={(keyPeople) => onChange({ ...content, keyPeople })}
      list="keyPeople"
      createItem={() => LISTS.keyPeople.create(content) as never}
      addLabel="Add person"
      emptyLabel="No key people added yet."
      renderItem={(item, update) => (
        <div>
          <FormField label="Name">
            <input style={inputStyle} value={item.name} onChange={(e) => update({ name: e.target.value })} />
          </FormField>
          <FormField label="Role (optional)">
            <input
              style={inputStyle}
              placeholder="e.g. Maid of Honor, Best Friend"
              value={item.role ?? ""}
              onChange={(e) => update({ role: e.target.value || undefined })}
            />
          </FormField>
        </div>
      )}
    />
  );
}
