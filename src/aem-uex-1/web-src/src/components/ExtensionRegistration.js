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
        canvas: {
          getRenderers() {
            return [
              // @todo YOUR CUSTOM DATA FIELD RENDERERS DECLARATION SHOULD BE HERE
              {
                extension: 'asset-picker-field',
                dataType: 'custom-image',
                url: '/index.html#/open-asset-picker',
                icon: 'OpenIn',
              },
              {
                extension: 'asset-picker-field',
                dataType: 'custom-image-mimetype',
                url: '/#/renderer/1',
                icon: 'OpenIn',
              },
              {
                extension: 'asset-picker-field',
                dataType: 'custom-image-rendition',
                url: '/index.html#/rendition-select',
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
