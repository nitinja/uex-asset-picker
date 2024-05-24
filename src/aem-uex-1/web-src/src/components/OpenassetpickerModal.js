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

async function fetchExtConfig() {
  let assetSelectorConfigUrl = {};
  try {
    assetSelectorConfigUrl = localStorage.getItem("assetSelectorConfig");
    if (assetSelectorConfigUrl) {
      const extConfig = await fetch(assetSelectorConfigUrl)
        .then((response) => response.json())
        .catch((e) => console.error("Error while fetching extConfig:", e));
      return extConfig;
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
  props.repoNames = extConfig.repoNames?.length ? extConfig.repoNames : null;
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
    setAssetSelectorProps(selectorProps);
  };

  useEffect(() => {
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  const onSelectionHandler = async (asset) => {
    // console.log("asset selected", JSON.stringify(asset[0]?._links["http://ns.adobe.com/adobecloud/rel/rendition"]));
    const assetType = asset[0].mimetype;
    const assetUrl =
      asset[0]?._links["http://ns.adobe.com/adobecloud/rel/rendition"].href;

    window.localStorage.setItem(assetSelectedEventName, JSON.stringify({
      assetUrl,
      assetType,
      assetName: asset[0].name,
    }));
    // window.localStorage.setItem("assetMimeTypeSelected", assetType);

    onCloseHandler();
  };

  const onCloseHandler = () => {
    guestConnection.host.modal.close();
  };

  const gerReposNameFromEndpoint = () => {
    try {
      const repoUrl = new URL(endpoint);
      return [repoUrl.hostname];
    } catch (e) {
      console.log("Error while getting repoName", e);
      return [];
    }
  };

  const filterRepos = (repos) => {
    const repoNames = assetSelectorProps.repoNames || gerReposNameFromEndpoint();
    console.log("using repoNames", repos, repoNames);
    return repos.filter((repo) => {
      const repoField =
        repo._embedded["http://ns.adobe.com/adobecloud/rel/repository"];
      return (
        repoField["aem:tier"] === "delivery" ||
        repoNames.includes(repoField["repo:repositoryId"])
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
        {/* {JSON.stringify(assetSelectorProps)} */}
        <AssetSelector
          dialogSize="fullscreen"
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
