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

const imsTokenFixed = 'abc123';

export default function () {
  const [guestConnection, setGuestConnection] = useState();

  useEffect(() => {
    (async () => {
      console.log('getting guest connection')
      const guestConnection = await attach({ id: extensionId });
      setGuestConnection(guestConnection);
      console.log(`shared context ${util.inspect(guestConnection.sharedContext, {showHidden: false, depth: null, colors: true})}`);
    })();
  }, []);

  const onCloseHandler = () => {
    guestConnection.host.modal.close();
  };

  console.log(`auth ${guestConnection?.sharedContext?.get("auth")}`);
  console.log(`ims org ${imsOrg}`);
  console.log(`ims token ${imsToken}`);

  return (
    <Provider theme={defaultTheme} colorScheme='light'>
      <Content>
        <AssetSelector
          dialogSize='fullscreen'
          apiKey="aem-assets-backend-nr-1"
          imsToken={imsTokenFixed}
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
