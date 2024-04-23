/*
 * <license header>
 */

import React, { useState, useEffect } from "react";
import { attach } from "@adobe/uix-guest";
import {
  Provider,
  Content,
  defaultTheme,
} from "@adobe/react-spectrum";
import { AssetSelector } from '@assets/selectors';
import { assetSelectedEventName, extensionId } from "./Constants";

export default function () {
  const [guestConnection, setGuestConnection] = useState();
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");

  const init = async () => {
    const connection = await attach({
      id: extensionId,
    });
    setGuestConnection(connection);
  };

  useEffect(() => {
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  const onSelectionHandler = (asset) => {
    localStorage.setItem(assetSelectedEventName, asset[0]?._links['http://ns.adobe.com/adobecloud/rel/rendition'].href);
    onCloseHandler();
  };

  const onCloseHandler = () => {
    guestConnection.host.modal.close();
  };

  const filterRepos = (repos) => {
    const repoUrl = new URL(endpoint);
    const repoName = repoUrl.hostname;
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
    <Provider theme={defaultTheme} colorScheme='light'>
      <Content>
        <AssetSelector
          aemTierType={['delivery', 'author']}
          dialogSize='fullscreen'
          apiKey="asset_search_service"
          imsToken={token}
          handleSelection={onSelectionHandler}
          onClose={onCloseHandler}
          filterRepoList={filterRepos}
        />
      </Content>
    </Provider>
  );
}
