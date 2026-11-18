import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Form,
  Heading,
  Picker,
  PickerItem,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from "@react-spectrum/s2";
import Brush from "@react-spectrum/s2/icons/Brush";
import InfoCircle from "@react-spectrum/s2/icons/InfoCircle";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useState, type ReactNode } from "react";
import type { Settings, SettingsUpdate, Theme } from "../../shared/settings";
import { concarte } from "../platform/bridge";
import { AboutPanel } from "./AboutPanel";

const SECTIONS = ["appearance", "about"] as const;
type Section = (typeof SECTIONS)[number];

const stackItem = style({
  gridRowStart: 1,
  gridColumnStart: 1,
  visibility: { default: "visible", isHidden: "hidden" },
});

/**
 * Lays every section over the others and shows only `selected`, so the dialog
 * keeps the size of the largest section instead of resizing as tabs change.
 * Only the selected tab's panel is mounted, so each panel holds the stack.
 */
function SectionStack({
  selected,
  children,
}: {
  selected: Section;
  children: Record<Section, ReactNode>;
}) {
  return (
    <div className={style({ display: "grid" })}>
      {SECTIONS.map((id) => (
        <div
          key={id}
          inert={id !== selected}
          className={stackItem({ isHidden: id !== selected })}
        >
          {children[id]}
        </div>
      ))}
    </div>
  );
}

/** Opens from the application menu. */
export function SettingsDialog() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [section, setSection] = useState<Section>("appearance");

  useEffect(
    () =>
      concarte.on.openSettings(() => {
        void concarte.settings.get().then(setSettings);
      }),
    [],
  );

  const update = (change: SettingsUpdate) => {
    void concarte.settings.update(change).then(setSettings);
  };

  return (
    <DialogContainer onDismiss={() => setSettings(null)}>
      {settings && (
        <Dialog size="L" isDismissible>
          {({ close }) => (
            <>
              <Heading slot="title">Settings</Heading>
              <Content>
                <Tabs
                  aria-label="Settings sections"
                  orientation="vertical"
                  selectedKey={section}
                  onSelectionChange={(key) => setSection(key as Section)}
                >
                  <TabList>
                    <Tab id="appearance">
                      <Brush />
                      <Text>Appearance</Text>
                    </Tab>
                    <Tab id="about">
                      <InfoCircle />
                      <Text>About</Text>
                    </Tab>
                  </TabList>
                  {SECTIONS.map((id) => (
                    <TabPanel key={id} id={id}>
                      <SectionStack selected={id}>
                        {{
                          appearance: (
                            <Form
                              labelPosition="side"
                              labelAlign="end"
                              styles={style({ maxWidth: 320 })}
                            >
                              <Picker
                                label="Theme"
                                value={settings.appearance.theme}
                                onChange={(theme) =>
                                  update({
                                    appearance: { theme: theme as Theme },
                                  })
                                }
                              >
                                <PickerItem id="light">Light</PickerItem>
                                <PickerItem id="dark">Dark</PickerItem>
                                <PickerItem id="system">System</PickerItem>
                              </Picker>
                            </Form>
                          ),
                          about: <AboutPanel />,
                        }}
                      </SectionStack>
                    </TabPanel>
                  ))}
                </Tabs>
              </Content>
              <ButtonGroup>
                <Button variant="accent" onPress={close}>
                  Close
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      )}
    </DialogContainer>
  );
}
