import type { FAQ, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle, textareaStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";

interface FaqFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

export default function FaqFields({ content, onChange }: FaqFieldsProps) {
  return (
    <ListEditor<FAQ>
      items={content.faqs}
      onChange={(faqs) => onChange({ ...content, faqs })}
      createItem={() => ({ id: createId("faq"), question: "", answer: "", order: content.faqs.length + 1 })}
      addLabel="Add FAQ"
      emptyLabel="No FAQs yet."
      renderItem={(item, update) => (
        <div>
          <FormField label="Question">
            <input style={inputStyle} value={item.question} onChange={(e) => update({ question: e.target.value })} />
          </FormField>
          <FormField label="Answer">
            <textarea style={textareaStyle} value={item.answer} onChange={(e) => update({ answer: e.target.value })} />
          </FormField>
        </div>
      )}
    />
  );
}
