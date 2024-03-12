/*
 * <license header>
 */

import { Text } from "@adobe/react-spectrum";
import { register } from "@adobe/uix-guest";
import { extensionId } from "./Constants";

function ExtensionRegistration() {
  const init = async () => {
    const guestConnection = await register({
      id: extensionId,
      methods: {
        headerMenu: {
          getButtons() {
            return [
              // @todo YOUR HEADER BUTTONS DECLARATION SHOULD BE HERE
              {
                id: 'asset-picker-modal',
                label: 'Open Asset Picker',
                icon: 'OpenIn',
                onClick() {
                  guestConnection.host.modal.showUrl({
                    title: "Open Asset Picker",
                    url: "/index.html#/open-asset-picker-modal",
                    width: "80vw",
                    height: "70vh",
                  });
                },
              },
            ];
          },
        },
        canvas: {
          getRenderers() {
            return [
              // @todo YOUR CUSTOM DATA FIELD RENDERERS DECLARATION SHOULD BE HERE
              {
                extension: 'asset-picker-field',
                dataType: 'reference',
                url: '/index.html#/open-asset-picker',
                icon: 'OpenIn',
              },
            ];
          },
        },
      }
    });
  };
  init().catch(console.error);

  return <Text>IFrame for integration with Host (AEM)...</Text>;
}

export default ExtensionRegistration;
