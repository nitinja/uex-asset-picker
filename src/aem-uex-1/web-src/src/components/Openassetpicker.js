/*
 * <license header>
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { attach } from "@adobe/uix-guest";
import {
  Provider,
  Content,
  defaultTheme,
  Flex,
  TextField,
  ActionButton,
  Text,
  Image,
  View,
  Well,
  LabeledValue,
} from "@adobe/react-spectrum";
import { Label } from "@react-spectrum/label";
import Close from "@spectrum-icons/workflow/Close";

import { extensionId, assetSelectedEventName } from "./Constants";

export default function () {
  // const customAssetField = useRef(null);
  const [guestConnection, setGuestConnection] = useState();
  const [assetUrl, setAssetUrl] = useState("");
  const [assetName, setAssetName] = useState("");
  const [extConfigUrl, setExtConfigUrl] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");

  const handleStorageChange = (event) => {
    if (event.key === assetSelectedEventName && event.newValue) {
      const asset = JSON.parse(event.newValue);
      setAssetUrl(asset.assetUrl);
      // setAssetName(asset.assetName);
    }
    localStorage.removeItem(event.key);
  };

  useEffect(() => {
    guestConnection?.host.field.onChange(assetUrl);
  }, [assetUrl]);

  const init = async () => {
    const connection = await attach({
      id: extensionId,
    });
    setGuestConnection(connection);
  };

  useEffect(() => {
    init().catch((e) =>
      console.error("Extension got the error during initialization:", e)
    );
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!guestConnection) {
      return;
    }
    const getState = async () => {
      console.log(
        "value getState:",
        await guestConnection.host.field.getValue()
      );
      console.log("value model:", await guestConnection.host.field.getModel());

      const model = await guestConnection.host.field.getModel();
      setExtConfigUrl(model.configUrl);
      setFieldLabel(model.label || "Asset");

      if (!assetUrl) {
        setAssetUrl((await guestConnection.host.field.getValue()) || "");
      }
    };
    getState().catch((e) => console.error("Extension error:", e));
  }, [guestConnection]);

  const showModal = () => {
    window.localStorage.setItem("assetSelectorConfig", extConfigUrl);
    guestConnection.host.modal.showUrl({
      title: "Asset Picker",
      url: "/index.html#/open-asset-picker-modal",
      width: "80vw",
      height: "70vh",
    });
  };
  
  const removeAsset = () => {
    setAssetUrl("");
    setAssetName("");
  }

  useEffect(() => {
    if (assetUrl) {
      try {
        const name = new URL(assetUrl).pathname?.split("/")?.pop() || "";
        setAssetName(name);
      } catch (e) {}
    }
  }, [assetUrl]);

  return (
    <Provider theme={defaultTheme} colorScheme="light">
      {/* {JSON.stringify(extConfigUrl)} */}
      <View backgroundColor={"gray-75"} marginBottom={"size-200"}>
        {/* {imageUrl} */}
        <Label>{fieldLabel}</Label>
        <View
          borderWidth="thin"
          borderColor="gray-200"
          borderRadius="medium"
          padding="size-75"
          backgroundColor={"gray-100"}
        >
          <Flex alignItems="center">
            
            <ActionButton onPress={showModal} isQuiet={!assetName}>
              {!assetUrl ? "+ Add" : null}
              <Flex alignItems="center">
                {assetUrl && (
                  <Image
                    width="size-400"
                    height="size-400"
                    src={assetUrl || ""}
                    objectFit="cover"
                  />
                )}
                <Text>{assetName}</Text>
              </Flex>
            </ActionButton>
            {assetUrl && (
              <ActionButton onPress={removeAsset} isQuiet>
                <Close />
              </ActionButton>
            )}
          </Flex>
        </View>
      </View>
    </Provider>
  );
}
