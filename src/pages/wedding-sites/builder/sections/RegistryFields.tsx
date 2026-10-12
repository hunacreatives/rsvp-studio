import type { CashGift, RegistryLink, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";
import { ImageUploadField } from "../components/ImageUploadField";

interface RegistryFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
  eventId?: string;
}

export default function RegistryFields({ content, onChange, eventId }: RegistryFieldsProps) {
  return (
    <div>
      <ListEditor<RegistryLink>
        items={content.registryLinks}
        onChange={(registryLinks) => onChange({ ...content, registryLinks })}
        createItem={() => ({ id: createId("registry"), storeName: "", url: "" })}
        addLabel="Add registry link"
        emptyLabel="No registry links yet."
        renderItem={(item, update) => (
          <div>
            <FormField label="Where to give">
              <input
                style={inputStyle}
                placeholder="SM Gift Registry, Rustan’s…"
                value={item.storeName}
                onChange={(e) => update({ storeName: e.target.value })}
              />
            </FormField>
            <FormField label="Link (optional)">
              <input style={inputStyle} value={item.url} onChange={(e) => update({ url: e.target.value })} />
            </FormField>
          </div>
        )}
      />

      {/* Cash gifts: GCash, Maya or a bank, with a QR code guests can scan. */}
      <p style={{ margin: "22px 0 4px", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Cash gifts</p>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--slate)" }}>GCash, Maya or bank details, with a QR code guests can scan.</p>
      <FormField label="Note above them (optional)">
        <input
          style={inputStyle}
          placeholder="Your presence is the best gift. If you’d like to give, here’s how."
          value={content.cashGiftNote ?? ""}
          onChange={(e) => onChange({ ...content, cashGiftNote: e.target.value })}
        />
      </FormField>
      <ListEditor<CashGift>
        items={content.cashGifts ?? []}
        onChange={(cashGifts) => onChange({ ...content, cashGifts })}
        createItem={() => ({ id: createId("gift"), label: "GCash", accountName: "", accountNumber: "" })}
        addLabel="Add GCash, Maya or bank"
        emptyLabel="No cash gift details yet."
        renderItem={(item, update) => (
          <div>
            <FormField label="Where">
              <input style={inputStyle} placeholder="GCash, Maya, BDO…" value={item.label} onChange={(e) => update({ label: e.target.value })} />
            </FormField>
            <FormField label="Account name">
              <input style={inputStyle} autoCapitalize="words" value={item.accountName} onChange={(e) => update({ accountName: e.target.value })} />
            </FormField>
            <FormField label="Number">
              <input style={inputStyle} inputMode="numeric" placeholder="0917 123 4567" value={item.accountNumber} onChange={(e) => update({ accountNumber: e.target.value })} />
            </FormField>
            <FormField label="QR code (optional)">
              <ImageUploadField
                eventId={eventId}
                masterUrl={item.qrUrl ?? ""}
                onUrlChange={(url) => update({ qrUrl: url || undefined })}
                onUploaded={(image) => update({ qrUrl: image.masterUrl })}
              />
            </FormField>
          </div>
        )}
      />
    </div>
  );
}
