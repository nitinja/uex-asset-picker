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

  const { filterKey } = useParams();
  // localStorage.setItem(assetSelectedMimeTypeEventName
  useEffect(() => {
    const init = async () => {
      // connect to the host
      const guestConnection = await attach({ id: extensionId });
      console.log("filterKey to save in local:", {[filterKey]: (await guestConnection.host.field.getValue()) || ""});      
      window.localStorage.setItem(`filterKeyAdded:${filterKey}`, JSON.stringify({[filterKey]: (await guestConnection.host.field.getValue()) || ""}));
    };
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  return <div></div>;
};
