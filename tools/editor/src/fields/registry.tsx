import {
  Picker,
  PickerItem,
  TextArea,
  type Key,
  type PickerProps,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
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
  errorText,
  fieldStyle,
  groupBox,
  helpText,
  Section,
  ShowInExplorerButton,
  TextField,
  Toggle,
  useCommit,
} from "../components/widgets";

/** A single-select Picker whose picks save immediately. */
function CommittingPicker({
  onChange,
  ...props
}: Omit<PickerProps<object>, "onSelectionChange" | "onChange"> & {
  onChange: (key: Key) => void;
}) {
  const commit = useCommit();
  return (
    <Picker
      {...props}
      onSelectionChange={(key) => {
        if (key !== null) {
          onChange(key);
          commit();
        }
      }}
    />
  );
}

// Matches the labels Spectrum draws above its fields.
const readOnlyLabel = style({
  font: "ui",
  color: "neutral-subdued",
  margin: 0,
  marginBottom: 4,
});

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
    <CommittingPicker
      label="Locale"
      description="The language of the content. Only languages the app has translations for can be chosen."
      selectedKey={value}
      onChange={(key) => onChange(String(key))}
      styles={fieldStyle}
    >
      {!ctx.locales.includes(value) && (
        <PickerItem id={value}>{`${value} (no translation)`}</PickerItem>
      )}
      {ctx.locales.map((locale) => (
        <PickerItem key={locale} id={locale}>
          {locale}
        </PickerItem>
      ))}
    </CommittingPicker>
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
        <p className={helpText}>
          Credits for graphics or other resources. Supports markdown.
        </p>
        {attributions.map((attribution, index) => (
          <div key={index} className={groupBox}>
            <TextArea
              label="Attribution"
              value={attribution}
              onChange={(text) =>
                onChange(attributions.map((a, i) => (i === index ? text : a)))
              }
              styles={style({ width: "full" })}
            />
            <div className={style({ marginTop: 12 })}>
              <Button
                onClick={() =>
                  onChange(attributions.filter((_, i) => i !== index))
                }
              >
                Remove attribution
              </Button>
            </div>
          </div>
        ))}
        <div className={style({ marginTop: 12 })}>
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
    <div
      className={style({
        marginTop: 12,
        display: "flex",
        alignItems: "end",
        gap: 8,
      })}
    >
      <CommittingPicker
        label="Source"
        selectedKey={assetPath(value)}
        onChange={(key) => onChange("/" + String(key))}
        styles={style({ flexGrow: 1 })}
      >
        {!ctx.assets.includes(assetPath(value)) && (
          <PickerItem id={assetPath(value)}>{`${value} (missing)`}</PickerItem>
        )}
        {ctx.assets.map((asset) => (
          <PickerItem key={asset} id={asset}>
            {`/${asset}`}
          </PickerItem>
        ))}
      </CommittingPicker>
      <ShowInExplorerButton asset={assetPath(value)} />
    </div>
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
    <div className={style({ marginTop: 12 })}>
      <p className={readOnlyLabel}>Source</p>
      <div className={style({ display: "flex", alignItems: "center", gap: 4 })}>
        <span className={style({ minWidth: 0, overflowWrap: "anywhere" })}>
          {value}
        </span>
        <ShowInExplorerButton asset={assetPath(value)} />
      </div>
    </div>
  ),
  overlays: ({ value, onChange, ctx }) => {
    const overlays = value ?? [];
    return (
      <Section title="Overlays">
        {overlays.map((overlay, index) => (
          <div key={index} className={groupBox}>
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
            <div className={style({ marginTop: 12 })}>
              <Button
                onClick={() => onChange(overlays.filter((_, i) => i !== index))}
              >
                Remove overlay
              </Button>
            </div>
          </div>
        ))}
        <div className={style({ marginTop: 12 })}>
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
      <p className={helpText}>
        Shown at the bottom of the description. Clicking the room on the map
        opens it in a new tab.
      </p>
      {value ? (
        <div className={groupBox}>
          {renderRegistry(
            linkFields,
            value,
            (patch) => onChange({ ...value, ...patch }),
            ctx,
          )}
          {error && (
            <p className={style({ marginTop: 8 }) + " " + errorText}>{error}</p>
          )}
          <div className={style({ marginTop: 12 })}>
            <Button onClick={() => onChange(undefined)}>Remove link</Button>
          </div>
        </div>
      ) : (
        <div className={style({ marginTop: 12 })}>
          <Button onClick={() => onChange({ href: "", title: "" })}>
            + Add link
          </Button>
        </div>
      )}
    </Section>
  ),
  area: { managedBy: "the Assign as room button" },
};
