import type { RegistryLink, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";

interface RegistryFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

export default function RegistryFields({ content, onChange }: RegistryFieldsProps) {
  return (
    <ListEditor<RegistryLink>
      items={content.registryLinks}
      onChange={(registryLinks) => onChange({ ...content, registryLinks })}
      createItem={() => ({ id: createId("registry"), storeName: "", url: "" })}
      addLabel="Add registry link"
      emptyLabel="No registry links yet."
      renderItem={(item, update) => (
        <div>
          <FormField label="Store name">
            <input
              style={inputStyle}
              placeholder="Crate & Barrel"
              value={item.storeName}
              onChange={(e) => update({ storeName: e.target.value })}
            />
          </FormField>
          <FormField label="Link">
            <input style={inputStyle} value={item.url} onChange={(e) => update({ url: e.target.value })} />
          </FormField>
        </div>
      )}
    />
  );
}
