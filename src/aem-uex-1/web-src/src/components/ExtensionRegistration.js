/*
 * <license header>
 */

import { Text } from "@adobe/react-spectrum";
import { register } from "@adobe/uix-guest";
import { extensionId } from "./Constants";

// A configuration variable names `asset-namespace` must be provided to this extension using extension manager. This default namespace will be used if not provided.
const DEFAULT_CUSTOM_ASSET_NAMESPACE = "custom-asset-namespace";

function ExtensionRegistration() {
  const init = async () => {
    const guestConnection = await register({
      id: extensionId,
      methods: {
        canvas: {
          getRenderers() {
            const customAssetNamespace = guestConnection.configuration?.["asset-namespace"] || DEFAULT_CUSTOM_ASSET_NAMESPACE;
            console.log("getRenderers", guestConnection, customAssetNamespace);

            return [
              // @todo YOUR CUSTOM DATA FIELD RENDERERS DECLARATION SHOULD BE HERE
              {
                extension: 'asset-picker-field',
                dataType: `${customAssetNamespace}:custom-asset`, /* access guestConnection.configuration.mynamespace here */
                url: '/index.html#/open-asset-picker',
                icon: 'OpenIn',
              },
              {
                extension: 'asset-picker-field',
                dataType: `${customAssetNamespace}:custom-asset-mimetype`,
                url: '/#/renderer/1',
                icon: 'OpenIn',
              },
            ];
          },
        },
      }
    });
    // console.log("Config: ", guestConnection.configuration);

  };
  init().catch(console.error);

  return <Text>IFrame for integration with Host (AEM)...</Text>;
}

export default ExtensionRegistration;
