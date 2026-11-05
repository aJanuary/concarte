import type { ReactNode } from "react";
import {
  assetPath,
  type Config,
  type MapConfig,
  type Overlay,
  type Room,
  type RoomLink,
  type Theme,
} from "../../shared/schema";
import { ColorField } from "../components/ColorField";
import { MarkdownField } from "../components/MarkdownField";
import { StringListField } from "../components/StringListField";
import {
  Button,
  Field,
  inputClass,
  Section,
  TextField,
  Toggle,
} from "../components/widgets";

export type FieldContext = {
  assets: string[];
  locales: string[];
  aliasSuggestions: string[];
  filterSuggestions: string[];
};

export type FieldProps<T, K extends keyof T> = {
  value: T[K];
  onChange: (value: T[K]) => void;
  ctx: FieldContext;
  error?: string;
};

export type FieldEditor<T, K extends keyof T> = (
  props: FieldProps<T, K>,
) => ReactNode;

export type Managed = { managedBy: string };

export type Registry<T> = {
  [K in keyof T]-?: FieldEditor<T, K> | Managed;
};

export function renderRegistry<T extends object>(
  registry: Registry<T>,
  value: T,
  onPatch: (patch: Partial<T>) => void,
  ctx: FieldContext,
  errors: Partial<Record<keyof T, string>> = {},
): ReactNode {
  return (Object.keys(registry) as (keyof T)[]).map((key) => {
    const editor = registry[key];
    if (typeof editor !== "function") {
      return null;
    }
    const Editor = editor as FieldEditor<T, keyof T>;
    return (
      <Editor
        key={String(key)}
        value={value[key]}
        onChange={(v) => onPatch({ [key]: v } as unknown as Partial<T>)}
        ctx={ctx}
        error={errors[key]}
      />
    );
  });
}

function colorField<K extends keyof Theme>(
  label: string,
  hint: string,
): FieldEditor<Theme, K> {
  return function ColorEditor({ value, onChange }) {
    return (
      <ColorField label={label} hint={hint} value={value} onChange={onChange} />
    );
  };
}

export const themeFields: Registry<Theme> = {
  background: colorField(
    "Background",
    "Background of the whole page. Should match the background of the map.",
  ),
  "control-background": colorField(
    "Control background",
    "Search box, filter pills and the info panel.",
  ),
  "highlight-background": colorField(
    "Highlight background",
    "Rooms in the room list when hovered.",
  ),
  border: colorField(
    "Border",
    "Search box border and the lines between rooms in the list.",
  ),
  "primary-text": colorField("Primary text", "Most of the text."),
  "secondary-text": colorField("Secondary text", "Such as aliases."),
  accent: colorField("Accent", "Links and room borders."),
  disabled: colorField("Disabled", "Disabled buttons."),
};

export const configFields: Registry<Config> = {
  eventName: ({ value, onChange }) => (
    <TextField
      label="Event name"
      hint="Shown in titles and on the about page."
      value={value}
      onChange={onChange}
    />
  ),
  locale: ({ value, onChange, ctx }) => (
    <Field
      label="Locale"
      hint="The language of the content. Only languages the app has translations for can be chosen."
    >
      {(id) => (
        <select
          id={id}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {!ctx.locales.includes(value) && (
            <option value={value}>{value} (no translation)</option>
          )}
          {ctx.locales.map((locale) => (
            <option key={locale} value={locale}>
              {locale}
            </option>
          ))}
        </select>
      )}
    </Field>
  ),
  description: ({ value, onChange }) => (
    <MarkdownField label="Description" value={value} onChange={onChange} />
  ),
  filters: ({ value, onChange, ctx }) => (
    <StringListField
      label="Filters"
      hint="Quick-filter pills below the search box, matched against room labels and aliases."
      value={value ?? []}
      onChange={onChange}
      suggestions={ctx.filterSuggestions}
    />
  ),
  attributions: ({ value, onChange }) => {
    const attributions = value ?? [];
    return (
      <Section title="Attributions">
        <p className="text-xs text-slate-500">
          Credits for graphics or other resources. Supports markdown.
        </p>
        {attributions.map((attribution, index) => (
          <div key={index} className="mt-2 rounded border border-slate-300 p-2">
            <Field label="Attribution">
              {(id) => (
                <textarea
                  id={id}
                  rows={3}
                  className={inputClass}
                  value={attribution}
                  onChange={(e) =>
                    onChange(
                      attributions.map((a, i) =>
                        i === index ? e.target.value : a,
                      ),
                    )
                  }
                />
              )}
            </Field>
            <div className="mt-3">
              <Button
                danger
                onClick={() =>
                  onChange(attributions.filter((_, i) => i !== index))
                }
              >
                Remove attribution
              </Button>
            </div>
          </div>
        ))}
        <div className="mt-3">
          <Button onClick={() => onChange([...attributions, ""])}>
            + Add attribution
          </Button>
        </div>
      </Section>
    );
  },
  theme: ({ value, onChange, ctx }) => (
    <Section title="Theme">
      {renderRegistry(
        themeFields,
        value,
        (patch) => onChange({ ...value, ...patch }),
        ctx,
      )}
    </Section>
  ),
  defaultMap: { managedBy: "the map panel" },
  maps: { managedBy: "the tree" },
};

export const overlayFields: Registry<Overlay> = {
  id: ({ value, onChange }) => (
    <TextField
      label="Id"
      hint="Overlays with the same id on different maps switch on and off together."
      value={value}
      onChange={onChange}
    />
  ),
  label: ({ value, onChange }) => (
    <TextField label="Label" value={value} onChange={onChange} />
  ),
  src: ({ value, onChange, ctx }) => (
    <Field label="Source">
      {(id) => (
        <select
          id={id}
          className={inputClass}
          value={assetPath(value)}
          onChange={(e) => onChange("/" + e.target.value)}
        >
          {!ctx.assets.includes(assetPath(value)) && (
            <option value={assetPath(value)}>{value} (missing)</option>
          )}
          {ctx.assets.map((asset) => (
            <option key={asset} value={asset}>
              /{asset}
            </option>
          ))}
        </select>
      )}
    </Field>
  ),
};

export const mapFields: Registry<MapConfig> = {
  id: ({ value, onChange, error }) => (
    <TextField
      label="Id"
      hint="Appears in the URL."
      value={value}
      onChange={onChange}
      error={error}
    />
  ),
  label: ({ value, onChange, error }) => (
    <TextField
      label="Label"
      hint="Shown in the floor selector."
      value={value}
      onChange={onChange}
      error={error}
    />
  ),
  src: ({ value }) => (
    <div className="mt-3">
      <p className="font-medium text-slate-700">Source</p>
      <p className="break-all text-slate-600">{value}</p>
    </div>
  ),
  overlays: ({ value, onChange, ctx }) => {
    const overlays = value ?? [];
    return (
      <Section title="Overlays">
        {overlays.map((overlay, index) => (
          <div key={index} className="mt-2 rounded border border-slate-300 p-2">
            {renderRegistry(
              overlayFields,
              overlay,
              (patch) =>
                onChange(
                  overlays.map((o, i) =>
                    i === index ? { ...o, ...patch } : o,
                  ),
                ),
              ctx,
            )}
            <div className="mt-3">
              <Button
                danger
                onClick={() => onChange(overlays.filter((_, i) => i !== index))}
              >
                Remove overlay
              </Button>
            </div>
          </div>
        ))}
        <div className="mt-3">
          <Button
            onClick={() =>
              onChange([
                ...overlays,
                { id: "", label: "", src: "/" + (ctx.assets[0] ?? "") },
              ])
            }
          >
            + Add overlay
          </Button>
        </div>
      </Section>
    );
  },
  rooms: { managedBy: "the tree" },
};

export const linkFields: Registry<RoomLink> = {
  href: ({ value, onChange }) => (
    <TextField label="Link address" value={value} onChange={onChange} />
  ),
  title: ({ value, onChange }) => (
    <TextField label="Link title" value={value} onChange={onChange} />
  ),
};

export const roomFields: Registry<Room> = {
  id: ({ value, onChange, error }) => (
    <TextField
      label="Id"
      hint="Appears in the URL."
      value={value}
      onChange={onChange}
      error={error}
    />
  ),
  label: ({ value, onChange, error }) => (
    <TextField label="Label" value={value} onChange={onChange} error={error} />
  ),
  aliases: ({ value, onChange, ctx }) => (
    <StringListField
      label="Aliases"
      hint="Other names for the room. The search box matches these."
      value={value ?? []}
      onChange={onChange}
      suggestions={ctx.aliasSuggestions}
    />
  ),
  description: ({ value, onChange }) => (
    <MarkdownField
      label="Description"
      value={value ?? ""}
      onChange={onChange}
    />
  ),
  searchable: ({ value, onChange }) => (
    <Toggle
      label="Searchable"
      hint="Whether the room appears in the search list."
      checked={value !== false}
      onChange={(checked) => onChange(checked ? undefined : false)}
    />
  ),
  link: ({ value, onChange, ctx, error }) => (
    <Section title="Link">
      <p className="text-xs text-slate-500">
        Shown at the bottom of the description. Clicking the room on the map
        opens it in a new tab.
      </p>
      {value ? (
        <div className="mt-2 rounded border border-slate-300 p-2">
          {renderRegistry(
            linkFields,
            value,
            (patch) => onChange({ ...value, ...patch }),
            ctx,
          )}
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          <div className="mt-3">
            <Button danger onClick={() => onChange(undefined)}>
              Remove link
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Button onClick={() => onChange({ href: "", title: "" })}>
            + Add link
          </Button>
        </div>
      )}
    </Section>
  ),
  area: { managedBy: "the Assign as room button" },
};
