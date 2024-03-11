/*
 * <license header>
 */

import React, { useState, useEffect } from "react";
import { attach } from "@adobe/uix-guest";
import {
  Provider,
  Content,
  defaultTheme,
  Flex,
  ActionButton,
  DialogTrigger,
  Button,
  Dialog,
  Heading,
  Header,
  Divider,
  Text,
  ButtonGroup,
} from "@adobe/react-spectrum";
import { extensionId } from "./Constants";

export default function () {
  const [guestConnection, setGuestConnection] = useState();

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

  return (
    <Provider theme={defaultTheme} colorScheme='light'>
      <Content>
        <Flex direction="row">
          <DialogTrigger>
            <ActionButton>Select asset</ActionButton>
            {(close) => (
              <Dialog>
                <Heading>Internet Speed Test</Heading>
                <Header>Connection status: Connected</Header>
                <Divider />
                <Content>
                  <Text>
                    Start speed test?
                  </Text>
                </Content>
                <ButtonGroup>
                  <Button variant="secondary" onPress={close}>Cancel</Button>
                  <Button variant="accent" onPress={close}>Confirm</Button>
                </ButtonGroup>
              </Dialog>
            )}
          </DialogTrigger>
        </Flex>
      </Content>
    </Provider>
  );
}
