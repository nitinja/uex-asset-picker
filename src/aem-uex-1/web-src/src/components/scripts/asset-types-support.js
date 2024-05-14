/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2023 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/

/**
 * @typedef AssetSelectorConfig
 * @property {string} [imsClientId] If provided, will be used as the client ID
 *  when authenticating with IMS.
 * @property {string} [repositoryId] If provided, will be used as the selected
 *  repository in the Asset Selector.
 * @property {string} [imsOrgId] If provided, will be used as the IMS org to use
 *  when logging in through IMS.
 * @property {string} [environment] If provided, will be the IMS environment to
 *  use when logging in through IMS. Should be STAGE or PROD.
 */

const PDF_MIMETYPE = 'application/pdf';
const PDF_LABEL = 'PDF Documents';
const VIDEO_MIMETYPE = 'video/mp4';
const VIDEO_LABEL = 'Videos';
const ZIP_MIMETYPE = 'application/zip';
const ZIP_LABEL = 'ZIP Archives';
const DOCX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_LABEL = 'Word Documents';
const XLSX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XLSX_LABEL = 'Excel Documents';
const HTML_MIMETYPE = 'text/html';

/**
 * Checks is asset delivery is supported for the given configuration
 * @param {*} cfg Configuration
 * @returns true if asset delivery is supported, false otherwise
 */
export function isAssetDeliverySupported(cfg) {
    if (!cfg) return false;
    return (cfg['repository-id'] ?? '').trim().toLowerCase().startsWith('delivery');
}

/**
 * Gets the format of an asset.
 * @param {*} asset
 * @returns The asset format (as mimetype when available, or as type otherwise)
 */
export function getAssetFormat(asset) {
    return (asset['dc:format'] ?? asset.mimetype ?? '').trim().toLowerCase();
}

/**
 * CHecks if an asset is of a given type
 * @param {*} asset
 * @param {*} type Type to use for type check
 * @returns True is asset is of the selected type, false otherwise
 */
function isAssetType(asset, type) {
    if (!asset || !type) return false;

    const format = getAssetFormat(asset);
    return format ? format.startsWith(`${type}/`) : asset.type === type;
}

/**
 * Checks if the given asset is an image asset.
 * @param {*} asset
 * @returns true if the asset is an image asset, false otherwise
 */
export function isImageAsset(asset) {
    return isAssetType(asset, 'image');
}

/**
 * Checks if the given asset is a video asset.
 * @param {*} asset
 * @returns true if the asset is a video asset, false otherwise
 */
export function isVideoAsset(asset) {
    return isAssetType(asset, 'video');
}

/**
 * Adds or removes document support in the asset selector filter schema
 * @param {*} assetSelectorProps Asset selector properties
 * @param {string} supportedAssetMimeType MIME type of the document
 * @param {string} label Label for the document type
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 * @param {Array} supportedAssetsFormats Current array of supported assets formats
 * @param {boolean} addSupport Flag indicating whether to add or remove support
 */
function updateDocumentSupport(
    assetSelectorProps,
    supportedAssetMimeType,
    supportedRenditionMimeType,
    label,
    supportedRenditionFormats,
    supportedAssetsFormats,
    addSupport
) {
    const mimeTypes = assetSelectorProps.filterSchema[1].fields[0];
    const defaultValueIndex = mimeTypes.defaultValue.indexOf(supportedAssetMimeType);
    const optionIndex = mimeTypes.options.findIndex((value) => value.value === supportedAssetMimeType);

    if (addSupport) {
        if (defaultValueIndex === -1) {
            mimeTypes.defaultValue.push(supportedAssetMimeType);
        }
        if (optionIndex === -1) {
            mimeTypes.options.push({
                label: label,
                value: supportedAssetMimeType,
            });
        }
        if (!supportedRenditionFormats.includes(supportedRenditionMimeType)) {
            supportedRenditionFormats.push(supportedRenditionMimeType);
        }
        if (supportedAssetsFormats && !supportedAssetsFormats.includes(supportedAssetMimeType)) {
            supportedAssetsFormats.push(supportedAssetMimeType);
        }
    } else {
        if (defaultValueIndex !== -1) {
            mimeTypes.defaultValue.splice(defaultValueIndex, 1);
        }
        if (optionIndex !== -1) {
            mimeTypes.options.splice(optionIndex, 1);
        }
        const renditionIndex = supportedRenditionFormats.indexOf(supportedRenditionMimeType);
        if (renditionIndex !== -1) {
            supportedRenditionFormats.splice(renditionIndex, 1);
        }
        const assetsIndex = supportedAssetsFormats ? supportedAssetsFormats.indexOf(supportedAssetMimeType) : -1;
        if (assetsIndex !== -1) {
            supportedAssetsFormats.splice(assetsIndex, 1);
        }
    }
}

/**
 * Enables PDF support in the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 */
export function addPdfSupport(assetSelectorProps, supportedRenditionFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        PDF_MIMETYPE,
        PDF_MIMETYPE,
        PDF_LABEL,
        supportedRenditionFormats,
        null,
        true
    );
}

/**
 * Removes PDF support from the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 */
export function removePdfSupport(assetSelectorProps, supportedRenditionFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        PDF_MIMETYPE,
        PDF_MIMETYPE,
        PDF_LABEL,
        supportedRenditionFormats,
        null,
        false
    );
}

/**
 * Enables Video support in the asset selector
 * @param assetSelectorProps Asset selector properties
 * @param supportedRenditionFormats Current array of supported rendition formats
 * @param supportedAssetsFormats Current array of supported assets formats
 */
export function addVideoSupport(assetSelectorProps, supportedRenditionFormats, supportedAssetsFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        VIDEO_MIMETYPE,
        HTML_MIMETYPE,
        VIDEO_LABEL,
        supportedRenditionFormats,
        supportedAssetsFormats,
        true
    );
}

/**
 * Removes Video support from the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 * @param supportedAssetsFormats
 */
export function removeVideoSupport(assetSelectorProps, supportedRenditionFormats, supportedAssetsFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        VIDEO_MIMETYPE,
        HTML_MIMETYPE,
        VIDEO_LABEL,
        supportedRenditionFormats,
        supportedAssetsFormats,
        false
    );
}

/**
 * Enables ZIP support in the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 */
export function addZipSupport(assetSelectorProps, supportedRenditionFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        ZIP_MIMETYPE,
        ZIP_MIMETYPE,
        ZIP_LABEL,
        supportedRenditionFormats,
        null,
        true
    );
}

/**
 * Removes ZIP support from the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 */
export function removeZipSupport(assetSelectorProps, supportedRenditionFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        ZIP_MIMETYPE,
        ZIP_MIMETYPE,
        ZIP_LABEL,
        supportedRenditionFormats,
        null,
        false
    );
}

/**
 * Enables DOCX support in the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 */
export function addDocxSupport(assetSelectorProps, supportedRenditionFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        DOCX_MIMETYPE,
        DOCX_MIMETYPE,
        DOCX_LABEL,
        supportedRenditionFormats,
        null,
        true
    );
}

/**
 * Removes DOCX support from the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 */
export function removeDocxSupport(assetSelectorProps, supportedRenditionFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        DOCX_MIMETYPE,
        DOCX_MIMETYPE,
        DOCX_LABEL,
        supportedRenditionFormats,
        null,
        false
    );
}

/**
 * Enables XLSX support in the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 */
export function addXlsxSupport(assetSelectorProps, supportedRenditionFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        XLSX_MIMETYPE,
        XLSX_MIMETYPE,
        XLSX_LABEL,
        supportedRenditionFormats,
        null,
        true
    );
}

/**
 * Removes XLSX support from the asset selector
 * @param {*} assetSelectorProps Asset selector properties
 * @param {Array} supportedRenditionFormats Current array of supported rendition formats
 */
export function removeXlsxSupport(assetSelectorProps, supportedRenditionFormats) {
    updateDocumentSupport(
        assetSelectorProps,
        XLSX_MIMETYPE,
        XLSX_MIMETYPE,
        XLSX_LABEL,
        supportedRenditionFormats,
        null,
        false
    );
}
