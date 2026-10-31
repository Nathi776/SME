import { useEffect, useState } from "react";
import { ConsentApi, MODEL_IMPROVEMENT } from "../../api/consentApi";

// Fallback wording if the policy endpoint is unreachable. The server text wins when available.
const FALLBACK =
  "Allow my anonymised business data to be used to improve the scoring model. Optional, does not affect my assessment or funding request, and I can withdraw at any time.";

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
}

/** Opt-in consent checkbox. Never pre-ticked: the parent must start with `false`. */
export default function ConsentCheckbox({ checked, onChange }: Props) {
  const [text, setText] = useState(FALLBACK);

  useEffect(() => {
    ConsentApi.getPolicy()
      .then(({ data }) => {
        const p = data.purposes.find((x) => x.purpose === MODEL_IMPROVEMENT);
        if (p?.description) setText(p.description);
      })
      .catch(() => undefined);
  }, []);

  return (
    <label className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-3">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-700">
        <span className="font-semibold text-gray-800">Help improve the scoring model (optional)</span>
        <span className="mt-0.5 block text-xs text-gray-500">{text}</span>
      </span>
    </label>
  );
}
