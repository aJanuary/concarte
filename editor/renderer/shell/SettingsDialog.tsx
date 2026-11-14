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
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useState } from "react";
import type { Settings, SettingsUpdate, Theme } from "../../shared/settings";
import { concarte } from "../platform/bridge";

/** Opens from the application menu. */
export function SettingsDialog() {
  const [settings, setSettings] = useState<Settings | null>(null);

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
        <Dialog size="M" isDismissible>
          {({ close }) => (
            <>
              <Heading slot="title">Settings</Heading>
              <Content>
                <Tabs aria-label="Settings sections" orientation="vertical">
                  <TabList>
                    <Tab id="appearance">
                      <Brush />
                      <Text>Appearance</Text>
                    </Tab>
                  </TabList>
                  <TabPanel id="appearance">
                    <Form labelPosition="side" labelAlign="end">
                      <Picker
                        label="Theme"
                        value={settings.appearance.theme}
                        onChange={(theme) =>
                          update({ appearance: { theme: theme as Theme } })
                        }
                      >
                        <PickerItem id="light">Light</PickerItem>
                        <PickerItem id="dark">Dark</PickerItem>
                        <PickerItem id="system">System</PickerItem>
                      </Picker>
                    </Form>
                  </TabPanel>
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
