import {
  Accordion,
  ActionButton,
  Disclosure,
  DisclosureHeader,
  DisclosurePanel,
  DisclosureTitle,
  PickerItem,
  Text,
  TextArea,
  TextField as S2TextField,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState, type ReactNode } from "react";

type Key = string | number;
import type { PageMessages } from "../../../shared/api";
import {
  assetPath,
  srcFromAsset,
  type Config,
  type MapConfig,
  type Overlay,
  type PageSettings,
  type Room,
  type RoomLink,
  type Theme,
} from "../../../shared/schema";
import { TextField } from "../../ui/controls";
import { errorText, fieldStack, fieldStyle, helpText } from "../../ui/styles";
import { BasePathField } from "./fields/BasePathField";
import { ColorField } from "./fields/ColorField";
import { CommittingPicker, Toggle } from "./fields/committing";
import { MarkdownField } from "./fields/MarkdownField";
import { ShowInExplorerButton } from "./fields/ShowInExplorerButton";
import { StringListField } from "./fields/StringListField";
import { useImportSvg } from "../useImportSvg";
import { useSession } from "../session";
import type { SectionSpec } from "./PropertiesPanel";

const fieldWithButton = style({
  display: "flex",
  alignItems: "end",
  gap: 8,
});

function AddButton({
  children,
  onPress,
}: {
  children: string;
  onPress: () => void;
}) {
  return (
    <ActionButton onPress={onPress} styles={style({ alignSelf: "start" })}>
      <Add />
      <Text>{children}</Text>
    </ActionButton>
  );
}

function DeleteButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <ActionButton aria-label={label} isQuiet onPress={onPress}>
      <Delete />
    </ActionButton>
  );
}

/** What field editors need to know beyond their own value. */
export type FieldContext = {
  /** Locales the site has translations for. */
  locales: string[];
  aliasSuggestions: string[];
  filterSuggestions: string[];
  /** The page title and description the site uses when the event sets none. */
  pageDefaults: PageSettings | undefined;
};

function pageDefaults(
  doc: Config,
  messages: PageMessages,
): PageSettings | undefined {
  // The site can't build without a translation for its locale, but English
  // still gives something sensible to start from until there is one.
  const page = messages[doc.locale] ?? messages.en;
  const fill = (message: string) =>
    message.replaceAll("{eventName}", doc.eventName);
  return (
    page && { title: fill(page.title), description: fill(page.description) }
  );
}

export function fieldContext(
  doc: Config,
  locales: string[],
  pageMessages: PageMessages,
): FieldContext {
  const aliases = new Set<string>();
  const labels = new Set<string>();
  for (const map of doc.maps) {
    for (const room of map.rooms) {
      room.aliases?.forEach((a) => aliases.add(a));
      if (room.label) {
        labels.add(room.label);
      }
    }
  }
  return {
    locales,
    aliasSuggestions: [...aliases, ...(doc.filters ?? [])].sort(),
    filterSuggestions: [...aliases, ...labels].sort(),
    pageDefaults: pageDefaults(doc, pageMessages),
  };
}

export type FieldProps<T, K extends keyof T> = {
  value: T[K];
  onChange: (value: T[K]) => void;
  ctx: FieldContext;
  error?: string;
  autoFocus?: boolean;
};

export type FieldEditor<T, K extends keyof T> = (
  props: FieldProps<T, K>,
) => ReactNode;

export type Managed = { managedBy: string };

/** A field shown as its own section of the panel, after the plain fields. */
export type SectionEditor<T, K extends keyof T> = {
  section: string;
  render: FieldEditor<T, K>;
};

export type Registry<T> = {
  [K in keyof T]-?: FieldEditor<T, K> | SectionEditor<T, K> | Managed;
};

export function renderRegistry<T extends object>(
  registry: Registry<T>,
  value: T,
  onPatch: (patch: Partial<T>) => void,
  ctx: FieldContext,
  errors: Partial<Record<keyof T, string>> = {},
  focusKey?: keyof T,
): { fields: ReactNode[]; sections: SectionSpec[] } {
  const fields: ReactNode[] = [];
  const sections: SectionSpec[] = [];
  for (const key of Object.keys(registry) as (keyof T)[]) {
    const entry = registry[key];
    if (typeof entry !== "function" && !("section" in entry)) {
      continue;
    }
    const Editor = (
      typeof entry === "function" ? entry : entry.render
    ) as FieldEditor<T, keyof T>;
    const editor = (
      <Editor
        key={String(key)}
        value={value[key]}
        onChange={(v) => onPatch({ [key]: v } as unknown as Partial<T>)}
        ctx={ctx}
        error={errors[key]}
        autoFocus={key === focusKey}
      />
    );
    if (typeof entry === "function") {
      fields.push(editor);
    } else {
      sections.push({ title: entry.section, content: editor });
    }
  }
  return { fields, sections };
}

function colorField<K extends keyof Theme>(
  label: string,
  hint: string,
): FieldEditor<Theme, K> {
  return function ColorEditor({ value, onChange, error }) {
    return (
      <ColorField
        label={label}
        hint={hint}
        value={value}
        onChange={onChange}
        error={error}
      />
    );
  };
}

const themeFields: Registry<Theme> = {
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
  accent: colorField(
    "Accent",
    "Links, active filters, and the outline of selected rooms.",
  ),
  "highlighted-room-background": colorField(
    "Highlighted room background",
    "Fill of selected rooms and rooms matching a search or filter.",
  ),
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
  basePath: ({ value, onChange, error }) => (
    <BasePathField value={value} onChange={onChange} error={error} />
  ),
  description: ({ value, onChange }) => (
    <MarkdownField label="Description" value={value} onChange={onChange} />
  ),
  page: {
    section: "Search and sharing",
    render: (props) => <PageSection {...props} />,
  },
  filters: ({ value, onChange, ctx }) => (
    <StringListField
      label="Filters"
      hint="Quick-filter pills below the search box, matched against room labels and aliases."
      value={value ?? []}
      onChange={onChange}
      suggestions={ctx.filterSuggestions}
    />
  ),
  attributions: {
    section: "Attributions",
    render: (props) => <AttributionsSection {...props} />,
  },
  theme: {
    section: "Theme",
    render: (props) => <ThemeSection {...props} />,
  },
  defaultMap: { managedBy: "the map panel" },
  maps: { managedBy: "the tree" },
};

const pageFields: Registry<PageSettings> = {
  title: ({ value, onChange, autoFocus }) => (
    <TextField
      label="Page title"
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
    />
  ),
  description: ({ value, onChange }) => (
    <TextField label="Page description" value={value} onChange={onChange} />
  ),
};

function PageSection({
  value,
  onChange,
  ctx,
  error,
}: FieldProps<Config, "page">) {
  // Only settings added in this session take focus, not ones that mount when
  // the panel opens.
  const [justAdded, setJustAdded] = useState(false);
  const defaults = ctx.pageDefaults;
  return (
    <>
      <p className={helpText}>
        Shown in browser tabs, search results and link previews.
      </p>
      {value ? (
        <>
          {
            renderRegistry(
              pageFields,
              value,
              (patch) => onChange({ ...value, ...patch }),
              ctx,
              {},
              justAdded ? "title" : undefined,
            ).fields
          }
          {error && (
            <p role="alert" className={errorText}>
              {error}
            </p>
          )}
          <ActionButton
            onPress={() => {
              setJustAdded(false);
              onChange(undefined);
            }}
            styles={style({ alignSelf: "start" })}
          >
            <Text>Use defaults</Text>
          </ActionButton>
        </>
      ) : (
        <ActionButton
          onPress={() => {
            setJustAdded(true);
            onChange(defaults ?? { title: "", description: "" });
          }}
          styles={style({ alignSelf: "start" })}
        >
          <Text>Customize title and description</Text>
        </ActionButton>
      )}
    </>
  );
}

function ThemeSection({ value, onChange, ctx }: FieldProps<Config, "theme">) {
  const { issues } = useSession();
  const errors: Partial<Record<keyof Theme, string>> = {};
  for (const issue of issues) {
    if (issue.severity === "error" && issue.themeKey) {
      errors[issue.themeKey] ??= issue.message;
    }
  }
  return renderRegistry(
    themeFields,
    value,
    (patch) => onChange({ ...value, ...patch }),
    ctx,
    errors,
  ).fields;
}

function AttributionsSection({
  value,
  onChange,
}: FieldProps<Config, "attributions">) {
  // Only an attribution added in this session takes focus, not ones that
  // mount when the panel opens.
  const [added, setAdded] = useState<number>();
  const attributions = value ?? [];
  return (
    <>
      <p className={helpText}>
        Credits for graphics or other resources. Supports markdown.
      </p>
      {attributions.map((attribution, index) => (
        <div key={index} className={fieldWithButton}>
          <TextArea
            label={`Attribution ${index + 1}`}
            value={attribution}
            onChange={(text) =>
              onChange(attributions.map((a, i) => (i === index ? text : a)))
            }
            autoFocus={index === added}
            styles={style({ flexGrow: 1 })}
          />
          <DeleteButton
            label={`Remove attribution ${index + 1}`}
            onPress={() => onChange(attributions.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <AddButton
        onPress={() => {
          setAdded(attributions.length);
          onChange([...attributions, ""]);
        }}
      >
        Add attribution
      </AddButton>
    </>
  );
}

function SourceField({ src }: { src: string }) {
  return (
    <div className={fieldWithButton}>
      <S2TextField
        label="Source"
        value={src}
        isReadOnly
        styles={style({ flexGrow: 1 })}
      />
      <ShowInExplorerButton asset={assetPath(src)} />
    </div>
  );
}

const overlayFields: Registry<Overlay> = {
  id: ({ value, onChange, autoFocus }) => (
    <TextField
      label="Id"
      hint="Overlays with the same id on different maps switch on and off together."
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
    />
  ),
  label: ({ value, onChange }) => (
    <TextField label="Label" value={value} onChange={onChange} />
  ),
  src: ({ value }) => <SourceField src={value} />,
};

function OverlaysSection({
  value,
  onChange,
  ctx,
}: FieldProps<MapConfig, "overlays">) {
  // Only an overlay added in this session takes focus, not ones that mount
  // when a map is selected.
  const [added, setAdded] = useState<number>();
  const [expanded, setExpanded] = useState<ReadonlySet<Key>>(new Set());
  const overlays = value ?? [];
  const { importSvg, dialog } = useImportSvg(
    "Couldn't add the overlay",
    (asset) => {
      setAdded(overlays.length);
      setExpanded((prev) => new Set(prev).add(String(overlays.length)));
      onChange([...overlays, { id: "", label: "", src: srcFromAsset(asset) }]);
    },
  );
  return (
    <>
      {/* Its own group: inside the section accordion, a disclosure would take
          its expanded state from that group instead. */}
      <Accordion
        allowsMultipleExpanded
        expandedKeys={expanded}
        onExpandedChange={setExpanded}
      >
        {overlays.map((overlay, index) => (
          // String id: a numeric 0 is falsy and is treated as having no id
          <Disclosure key={index} id={String(index)} isQuiet>
            <DisclosureHeader>
              <DisclosureTitle>
                {overlay.label || overlay.id || `Overlay ${index + 1}`}
              </DisclosureTitle>
              <DeleteButton
                label="Remove overlay"
                onPress={() => {
                  setExpanded(
                    (prev) =>
                      new Set(
                        [...prev]
                          .map(Number)
                          .filter((i) => i !== index)
                          .map((i) => String(i > index ? i - 1 : i)),
                      ),
                  );
                  onChange(overlays.filter((_, i) => i !== index));
                }}
              />
            </DisclosureHeader>
            <DisclosurePanel>
              <div className={fieldStack}>
                {
                  renderRegistry(
                    overlayFields,
                    overlay,
                    (patch) =>
                      onChange(
                        overlays.map((o, i) =>
                          i === index ? { ...o, ...patch } : o,
                        ),
                      ),
                    ctx,
                    {},
                    index === added ? "id" : undefined,
                  ).fields
                }
              </div>
            </DisclosurePanel>
          </Disclosure>
        ))}
      </Accordion>
      <AddButton onPress={importSvg}>Add overlay...</AddButton>
      {dialog}
    </>
  );
}

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
  src: ({ value }) => <SourceField src={value} />,
  overlays: {
    section: "Overlays",
    render: (props) => <OverlaysSection {...props} />,
  },
  rooms: { managedBy: "the tree" },
};

const linkFields: Registry<RoomLink> = {
  href: ({ value, onChange, autoFocus }) => (
    <TextField
      label="Link address"
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
    />
  ),
  title: ({ value, onChange }) => (
    <TextField label="Link title" value={value} onChange={onChange} />
  ),
};

function LinkSection({
  value,
  onChange,
  ctx,
  error,
}: FieldProps<Room, "link">) {
  // Only a link added in this session takes focus, not one that mounts when
  // a room is selected.
  const [justAdded, setJustAdded] = useState(false);
  return (
    <>
      <p className={helpText}>
        Shown at the bottom of the description. Clicking the room on the map
        opens it in a new tab.
      </p>
      {value ? (
        <>
          {
            renderRegistry(
              linkFields,
              value,
              (patch) => onChange({ ...value, ...patch }),
              ctx,
              {},
              justAdded ? "href" : undefined,
            ).fields
          }
          {error && (
            <p role="alert" className={errorText}>
              {error}
            </p>
          )}
          <ActionButton
            onPress={() => {
              setJustAdded(false);
              onChange(undefined);
            }}
            styles={style({ alignSelf: "start" })}
          >
            <Delete />
            <Text>Remove link</Text>
          </ActionButton>
        </>
      ) : (
        <AddButton
          onPress={() => {
            setJustAdded(true);
            onChange({ href: "", title: "" });
          }}
        >
          Add link
        </AddButton>
      )}
    </>
  );
}

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
  label: ({ value, onChange, error, autoFocus }) => (
    <TextField
      label="Label"
      value={value}
      onChange={onChange}
      error={error}
      autoFocus={autoFocus}
    />
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
  link: {
    section: "Link",
    render: (props) => <LinkSection {...props} />,
  },
  shape: { managedBy: "the Assign as room button" },
};
