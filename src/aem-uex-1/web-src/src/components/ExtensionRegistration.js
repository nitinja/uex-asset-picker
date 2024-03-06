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
                id: 'open-asset-picker',
                label: 'Open Asset Picker',
                icon: 'OpenIn',
                onClick() {
                  const modalURL = "/index.html#/open-asset-picker-modal";
                  console.log("Modal URL: ", modalURL);

                  guestConnection.host.modal.showUrl({
                    title: "Open Asset Picker",
                    url: modalURL,
                    width: "80vw",
                    height: "70vh",
                  });
                },
              },
            ];
          },
        },
        // rightPanel: {
        //   addRails() {
        //     return [
        //       // @todo YOUR RIGHT PANEL BUTTONS DECLARATION SHOULD BE HERE
        //       {
        //         extension: 'open-asset-picker-rail',
        //         id: 'open-asset-picker-rail',
        //         header: 'open-asset-picker-rail',
        //         url: 'open-asset-picker-rail',
        //         icon: 'OpenIn',
        //       }
        //     ];
        //   },
        // },
      }
    });
  };
  init().catch(console.error);

  return <Text>IFrame for integration with Host (AEM)...</Text>;
}

export default ExtensionRegistration;
