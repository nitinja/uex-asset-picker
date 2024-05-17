/*
 * <license header>
 */

import React, { useState, useEffect } from "react";
import { attach } from "@adobe/uix-guest";
import { Provider, Content, defaultTheme } from "@adobe/react-spectrum";
import { AssetSelector } from "@assets/selectors";
import {
  assetSelectedEventName,
  assetSelectedMimeTypeEventName,
  extensionId,
} from "./Constants";

// const filterSchema = [
//   {
//     fields: [
//       {
//         element: "checkbox",
//         name: "type",
//         defaultValue: ["image/*"],
//         options: [
//           {
//             label: "Image",
//             value: "image/*",
//             readOnly: true,
//           },
//         ],
//         orientation: "horizontal",
//       },
//     ],
//     header: "File Type",
//     groupKey: "FileTypeGroup",
//   },
// ];

async function fetchExtConfig() {
  let assetSelectorConfig = {};
  try {
    assetSelectorConfig = localStorage.getItem("assetSelectorConfig");
    if (assetSelectorConfig) {
      assetSelectorConfig = JSON.parse(assetSelectorConfig);
      if (assetSelectorConfig.extConfigUrl) {
        const extConfig = await fetch(assetSelectorConfig.extConfigUrl)
          .then((response) => response.json())
          .catch((e) => console.error("Error while fetching extConfig:", e));
          return extConfig;
        }
    }
  } catch (e) {
    console.log("Error while getting assetSelectorConfig from localStorage", e);
    return {};
  }
}

async function buildSelectorProps() {
  const props = {};
  const extConfig = await fetchExtConfig();
  console.log("fetched extConfig", extConfig);
  props.filterSchema = extConfig.filterSchema || [];
  props.aemTierType = extConfig.aemTierType || ["delivery", "author"];
  props.apiKey = extConfig.apiKey || "asset_search_service";
  // props.
  console.log("props", props);
  return props;
}

export default function () {
  const [guestConnection, setGuestConnection] = useState();
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");

  const [assetSelectorProps, setAssetSelectorProps] = useState({});

  const init = async () => {
    const connection = await attach({
      id: extensionId,
    });
    setGuestConnection(connection);
    const selectorProps = await buildSelectorProps();
    // selectorProps.filterRepoList = filterRepos;
    setAssetSelectorProps(selectorProps);
  };

  useEffect(() => {
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  const onSelectionHandler = async (asset) => {
    console.log("asset selected", JSON.stringify(asset[0]));
    
    const assetType =
      asset[0]?._links["http://ns.adobe.com/adobecloud/rel/rendition"]?.[0]
        .type;
    const assetLink =
      asset[0]?._links["http://ns.adobe.com/adobecloud/rel/rendition"].href;

    window.localStorage.setItem("assetSelected", assetLink);
    window.localStorage.setItem("assetMimeTypeSelected", assetType);

    onCloseHandler();
  };

  const onCloseHandler = () => {
    guestConnection.host.modal.close();
  };

  const filterRepos = (repos) => {
    console.log("conf: ", assetSelectorProps);
    const repoUrl = new URL(endpoint);
    const repoName = repoUrl.hostname;
    console.log("repoName", repoName);

    return repos.filter((repo) => {
      return (
        repo._embedded["http://ns.adobe.com/adobecloud/rel/repository"][
          "aem:tier"
        ] === "delivery" ||
        repo._embedded["http://ns.adobe.com/adobecloud/rel/repository"][
          "repo:repositoryId"
        ] === repoName
      );
    });
  };

  useEffect(() => {
    if (!guestConnection) {
      return;
    }
    const getState = async () => {
      const context = guestConnection.sharedContext;
      const imsToken = context.get("token");
      setToken(imsToken);
      const tempEditorState = await guestConnection.host.editorState.get();
      const { connections, customTokens } = tempEditorState;
      const tempEndpointName = Object.keys(connections).filter((key) =>
        connections[key].startsWith("xwalk:")
      )[0];
      if (tempEndpointName) {
        setEndpoint(connections[tempEndpointName].replace("xwalk:", ""));
        if (customTokens && customTokens[tempEndpointName]) {
          setToken(customTokens[tempEndpointName].replace("Bearer ", ""));
        }
      }
    };
    getState().catch((e) => console.error("Extension error:", e));
  }, [guestConnection]);

  return (
    <Provider theme={defaultTheme} colorScheme="light">
      <Content>
        {JSON.stringify(assetSelectorProps)}
        <AssetSelector
          // aemTierType={["delivery", "author"]}
          dialogSize="fullscreen"
          // apiKey="asset_search_service"
          imsToken={token}
          handleSelection={onSelectionHandler}
          onClose={onCloseHandler}
          filterRepoList={filterRepos}
          {...assetSelectorProps}
        />
      </Content>
    </Provider>
  );
}
