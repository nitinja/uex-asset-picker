/*
 * <license header>
 */

import {
  Button,
  Divider,
  Flex,
  Form,
  Heading,
  Item,
  Picker,
  ProgressCircle,
  Provider,
  TextField,
  View,
  defaultTheme,
  lightTheme,
} from "@adobe/react-spectrum";
import { attach } from "@adobe/uix-guest";
import React, { useCallback, useEffect, useState } from "react";
import { assetSelectedMimeTypeEventName, extensionId } from "./Constants";
import { useParams } from "react-router-dom";

export default () => {
  const [isLoading, setIsLoading] = useState(true);
  const [connection, setConnection] = useState();
  const [model, setModel] = useState();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [validationState, setValidationState] = useState();

  // localStorage.setItem(assetSelectedMimeTypeEventName
  useEffect(() => {
    const init = async () => {
      // connect to the host
      const guestConnection = await attach({ id: extensionId });
      setConnection(guestConnection);
      console.log("setting connection: ", guestConnection);

      // get model
      setModel(await guestConnection.host.field.getModel());
      // get field value
      setValue((await guestConnection.host.field.getValue()) || "");
      // get field error
      setError(await guestConnection.host.field.getError());
      // get field validation state
      setValidationState(await guestConnection.host.field.getValidationState());
      setIsLoading(false);
    };
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  const onChangeHandler = useCallback(
    (v) => {
      console.log("onChange on extension side", v, connection);
      console.log("connection: ", connection);
      //connection.host.field.onChange(v);
      setValue(v);
    },
    [connection]
  );

  const handleStorageChange = useCallback((event) => {
    console.log("storage event", event);

    if (event.key === assetSelectedMimeTypeEventName) {
      console.log("storage set event.newValue", event.newValue);

      setValue(event.newValue);
      // onChangeHandler(event.newValue);
      //customAssetField.current.focus();
      localStorage.removeItem(assetSelectedMimeTypeEventName);
    }
  }, []);

  useEffect(() => {
    if (connection) {
      //connection.host.field.onChange(value);
    }
  }, [value, connection]);

  // useEffect(() => {

  //   window.addEventListener("storage", handleStorageChange);

  //   return () => {
  //     window.removeEventListener("storage", handleStorageChange);
  //   };
  // }, []);

  return (
    <Provider theme={lightTheme} colorScheme="light">
      {!isLoading ? (
          <Flex direction="column" gap="size-65" marginBottom="size-100">
            <TextField
              validationState={error ? "invalid" : validationState}
              label={`${model.multi ? null : model.label}`}
              aria-label={model.label || model.name}
              defaultValue={value}
              value={value}
              maxLength={model.validation.maxLength}
              isReadOnly={true}
              isDisabled={true}
              errorMessage={error}
              onChange={onChangeHandler}
              width="100%"
              readOnly={true}
            />
          </Flex>
      ) : (
        <View width="97%" height="100%">
          <ProgressCircle />
        </View>
      )}
    </Provider>
  );
};
