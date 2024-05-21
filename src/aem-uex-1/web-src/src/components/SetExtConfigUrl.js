/*
 * <license header>
 */

import { attach } from "@adobe/uix-guest";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { extensionId } from "./Constants";

export default () => {

  useEffect(() => {
    const init = async () => {
      const guestConnection = await attach({ id: extensionId });
      window.localStorage.setItem("set-ext-config-url", await guestConnection.host.field.getValue() || "");
    };
    init().catch((e) =>
      console.log("Extension got the error during initialization:", e)
    );
  }, []);

  return <></>;
};
