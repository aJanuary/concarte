import {
  Accordion,
  Badge,
  Disclosure,
  DisclosurePanel,
  DisclosureTitle,
  Form,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";
import { fieldStack, helpText } from "../../ui/styles";

export type SectionSpec = { title: string; content: ReactNode };

/**
 * A properties panel: a heading with an optional badge and actions menu,
 * its fields, then its sections as an accordion.
 */
export function PropertiesPanel({
  title,
  subtitle,
  badge,
  actions,
  children,
  sections = [],
}: {
  title: ReactNode;
  /** A muted line of context under the heading. */
  subtitle?: ReactNode;
  badge?: string;
  actions?: ReactNode;
  children?: ReactNode;
  sections?: SectionSpec[];
}) {
  const titles = sections.map((s) => s.title);
  return (
    <Form
      // Fields save as they change; there is nothing to submit.
      onSubmit={(e) => e.preventDefault()}
    >
      <div
        className={style({
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        })}
      >
        <div className={style({ minWidth: 0 })}>
          <h2
            className={style({ font: "heading-sm", margin: 0, truncate: true })}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className={helpText + " " + style({ margin: 0, truncate: true })}
            >
              {subtitle}
            </p>
          )}
        </div>
        {badge && <Badge variant="informative">{badge}</Badge>}
        {actions && (
          <span className={style({ marginStart: "auto", flexShrink: 0 })}>
            {actions}
          </span>
        )}
      </div>
      {children}
      {sections.length > 0 && (
        <Accordion
          // Keyed so a panel showing different sections starts expanded.
          key={titles.join("|")}
          allowsMultipleExpanded
          defaultExpandedKeys={titles}
        >
          {sections.map((section) => (
            <Disclosure key={section.title} id={section.title}>
              <DisclosureTitle>{section.title}</DisclosureTitle>
              <DisclosurePanel>
                <div className={fieldStack}>{section.content}</div>
              </DisclosurePanel>
            </Disclosure>
          ))}
        </Accordion>
      )}
    </Form>
  );
}
