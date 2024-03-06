/*
 * <license header>
 */

import React, { useState, useEffect } from "react";
import { attach } from "@adobe/uix-guest";
import {
  Flex,
  Provider,
  Content,
  defaultTheme,
  Text,
  ButtonGroup,
  Button,
} from "@adobe/react-spectrum";
import { AssetSelector, DestinationSelector } from '@assets/selectors';
import { extensionId } from "./Constants";
import util from 'util';

export default function () {
  const [guestConnection, setGuestConnection] = useState();
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

  const onCloseHandler = () => {
    guestConnection.host.modal.close();
  };

  // Get basic state from guestConnection
  useEffect(() => {
    if (!guestConnection) {
      return;
    }
    const getState = async () => {
      const context = guestConnection.sharedContext;
      const imsToken = context.get("token");
      setToken(imsToken);
    };
    getState().catch((e) => console.log("Extension error:", e));
  }, [guestConnection]);

  return (
    <Provider theme={defaultTheme} colorScheme='light'>
      <Content>
        <AssetSelector
          dialogSize='fullscreen'
          apiKey="aem-assets-backend-nr-1"
          imsToken={token}
          handleSelection={(asset) => {
            console.log(`Selected asset: ${util.inspect(asset, {showHidden: false, depth: null, colors: true})}`);
            onCloseHandler();
          }}
          onClose={onCloseHandler}
        />

    {/* <DestinationSelector       
        discoveryURL="https://aem-discovery.adobe.io"
        apiKey="aem-assets-backend-nr-1"
        imsOrg={ims.org}
        imsToken={ims.token}
    /> */}
        
        {/* <Flex width="100%" justifyContent="end" alignItems="center" marginTop="size-400">
          <ButtonGroup align="end">
            <Button variant="primary" onClick={onCloseHandler}>Close</Button>
          </ButtonGroup>
        </Flex> */}
      </Content>
    </Provider>
  );
}
