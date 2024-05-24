/*
 * <license header>
 */

import {
  Flex,
  ProgressCircle,
  Provider,
  TextField,
  View,
  lightTheme,
} from "@adobe/react-spectrum";
import { attach } from "@adobe/uix-guest";
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { assetSelectedEventName, extensionId } from "./Constants";

export default () => {
  const [connection, setConnection] = useState();
  const [value, setValue] = useState("");

  useEffect(() => {
    const init = async () => {
      const guestConnection = await attach({ id: extensionId });
      setConnection(guestConnection);
      setValue((await guestConnection.host.field.getValue()) || "");
    };
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  const handleStorageChange = useCallback((event) => {
    if (event.key === assetSelectedEventName && event.newValue) {
      const asset = JSON.parse(event.newValue);
      setValue(asset.assetType);
      localStorage.removeItem(event.key);
    }
  }, []);

  useEffect(() => {
    console.log("connection::", value, connection);
    connection?.host.field.onChange(value);
  }, [value]);

  useEffect(() => {
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <></>
  );
};
