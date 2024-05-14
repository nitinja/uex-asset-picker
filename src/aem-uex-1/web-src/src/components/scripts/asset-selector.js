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

import { getLargestCopyRendition, getRendition } from './asset-rendition.js';
import { isValidHttpsUrl, getRel, REL_DOWNLOAD } from './asset-links.js';
import {
    getAssetFormat,
    isImageAsset,
    isVideoAsset,
    addPdfSupport,
    addVideoSupport,
    addZipSupport,
    addDocxSupport,
    addXlsxSupport,
    removePdfSupport,
    removeVideoSupport,
    removeZipSupport,
    removeDocxSupport,
    removeXlsxSupport,
    isAssetDeliverySupported,
} from './asset-types-support.js';
import { sampleRUM } from './rum.js';

const LOGIN_TIMEOUT = 2000;
const TOAST_NOTIFICATION_TIMEOUT = 3000;
const MAX_IMAGE_SIZE_BYTES = 20000000;
const ASSET_EMBEDDED_METADATA_PATH = 'http://ns.adobe.com/adobecloud/rel/metadata/embedded';
const FILE_TOO_LARGE_TXT = 'Selected image file is too large';
const SK_PLUGIN_ID = 'sidekick:custom:asset-library';

/* eslint-disable no-console */

/**
 * @typedef Links
 */

/**
 * @typedef Asset
 * @property {Links} _links Rels for the asset. Is expected to have a
 *  http://ns.adobe.com/adobecloud/rel/rendition rel for retrieving the
 *  asset's renditions, and a http://ns.adobe.com/adobecloud/rel/download
 *  rel for retrieving a URL to the asset's original content, which
 *  doesn't require authentication.
 */

/**
 * @typedef Rendition
 * @property {string} type Content type of the rendition.
 * @property {number} width Width, in pixels, of the rendition.
 * @property {string} href Full URL to the rendition's binary. This URL
 *  will require authentication.
 * @property {Links} _links Rels for the rendition. Is expected to have
 *  a http://ns.adobe.com/adobecloud/rel/download rel for retrieving a
 *  URL to the rendition's content, which doesn't require authentication.
 */

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

const HOST_REGEX = '^experience(-stage|-qa)?\\.adobe\\.com$';
const AS_MFE_DEFAULT_HOST = 'https://experience.adobe.com';
const AS_MFE_PATH = '/solutions/CQ-assets-selectors/static-assets/resources/assets-selectors.js';
const IMS_ENV_STAGE = 'stg1';
const IMS_ENV_PROD = 'prod';
const API_KEY = 'franklin';

const IMS_CLIENT_ID = 'cc-europa-desktop_7_0';
const ASSET_SELECTOR_ID = 'asset-selector';

const DEFAULT_CONVERSION_QUALITY = 1;
const DEFAULT_IMG_MIMETYPE = 'image/png';
const CLIPBOARD_SUPPORTED_BINARY_MIMETYPES = [DEFAULT_IMG_MIMETYPE];
const SUPPORTED_RENDITIONS_FORMATS = ['image/png', 'image/jpeg', 'image/webp'];
const SUPPORTED_ASSETS_FORMATS = ['image/vnd.adobe.photoshop', 'image/tiff'];
const assetsSelectorConfigs = {};

let imsInstance = null;
let imsEnvironment = IMS_ENV_PROD;

/**
 * Gets the EDS properties for the given configuration.
 * @param {*} cfg
 * @returns {string} EDS properties for the given configuration.
 */
function getEDSProps(cfg) {
    const { owner, repo, ref, project } = cfg;
    return `project=${project}:owner=${owner}:repo=${repo}:ref=${ref}`;
}

/**
 * Builds the selector's configuration based on query parameters.
 * @returns {AssetSelectorConfig} Configuration to use for the session.
 */
function getConfiguration() {
    const params = new URLSearchParams(window.location.search);
    const config = {};
    params.forEach((value, name) => (config[name] = value));
    return config;
}

/**
 * Sanitizes a value to prevent specific security threats such as scripts, events, and IIFEs.
 * @param {string} value - The value to sanitize.
 * @returns {string} - The sanitized value.
 */
function sanitizeValue(value) {
    // Regular expression to match script tags and their content
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

    // Regular expression to match various event attributes and JavaScript code in attributes
    const eventRegex = /on\w+="(?:[^"]*javascript:[^"]*|[^"]+)"/gi;

    // Regular expression to match immediately invoked function expressions (IIFEs)
    const iifeRegex = /\(?=>\s*{[^{}]*}\s*\)?|function\s*\w*\s*\([^)]*\)\s*{[^{}]*}/g;

    value = value.replace(scriptRegex, '');
    value = value.replace(eventRegex, '');
    value = value.replace(iifeRegex, '');

    return value;
}

/**
 * This function retrieves a configuration value for a given property and mimeType.
 * It iterates over the property configurations and checks if the mimeType matches the pattern specified in the configuration.
 * If a match is found, it returns the corresponding value from the configuration.
 *
 * @param {string} property - The property for which the configuration value is to be retrieved.
 * @param {string} mimeType - The mimeType which is used to match the pattern in the configuration.
 * @returns {string|undefined} - The configuration value if a match is found, otherwise undefined.
 */
function getConfigValue(property, mimeType) {
    const propConfigs = assetsSelectorConfigs[property];
    let closestMatch;

    if (!propConfigs || propConfigs.length === 0) {
        return undefined;
    }

    for (let i = propConfigs.length - 1; i >= 0; i--) {
        const currentConfig = propConfigs[i];
        const mimeTypePattern = currentConfig.mimeType.replace('*', '.*');
        const regex = new RegExp(`^${mimeTypePattern}$`);

        if (regex.test(mimeType)) {
            closestMatch = sanitizeValue(currentConfig.value);
            break;
        }
    }

    return closestMatch;
}

/**
 * Adds a new <script> tag to the documents <head>.
 * @param {string} url URL of the script to load.
 * @param {function} cb Invoked after the script has
 *  finished loading.
 * @param {string} [type] If provided, the value to use in
 *  the scripts "type" property. If unspecified the type
 *  will be left blank.
 * @returns {HTMLElement} The newly created script tag.
 */
function loadScript(url, cb, type) {
    const $head = document.querySelector('head');
    const $script = document.createElement('script');
    $script.src = url;
    if (type) {
        $script.setAttribute('type', type);
    }
    $head.append($script);
    $script.onload = cb;
    return $script;
}

/**
 * Loads an image into an HTML image (img) element
 * @param {*} url URL of the image to load into an img element
 * @returns Promise that will resolve once the image is loaded
 */
async function loadImageIntoHtmlElement(url, width, height) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        /*
        crossorigin needs to be anonymous to allow the future canvas export,
        otherwise the canvas will be considered tainted and the export will fail
        */
        img.setAttribute('crossorigin', 'anonymous');
        img.width = width;
        img.height = height;
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (err) => reject(err));
        img.src = url;
    });
}

/**
 * Convert an image using an URL to a another image format
 * @param {*} assetPublicUrl Public asset URL
 * @param {*} targetMimeType Target mimetype (target format)
 * @param {Asset} asset Source asset we're trying to use
 * @param {Asset} rendition Selected asset rendition we're trying to use
 * @returns A conversion promise resolving to a blob of the target mimetype
 */
async function convertImage(assetPublicUrl, targetMimeType, asset, rendition) {
    // in case the rendition metadata is missing, attempt falling back to asset size
    const width = rendition.width || asset['tiff:imageWidth'];
    const height = rendition.height || asset['tiff:imageLength'];
    if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
        throw new Error(
            `Rendition for asset ${asset.path} does not provide valid size metadata (tiff:imageWidth: ${width}, tiff:imageLength: ${height})`
        );
    }

    const imageElement = await loadImageIntoHtmlElement(assetPublicUrl, width, height);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    context.drawImage(imageElement, 0, 0, width, height);
    return canvas.convertToBlob({
        type: targetMimeType,
        quality: DEFAULT_CONVERSION_QUALITY,
    });
}

/**
 * Uses the navigator global object to write a clipboard item to the clipboard.
 * The clipboard item's content will be a Blob containing the image binary from
 * the given URL, which the method will retrieve.
 * @param {string} assetPublicUrl URL of the image to retrieve.
 * @param {string} mimeType Content type of the image being retrieved.
 * @param {Asset} asset Source asset we're trying to use
 * @param {Asset} rendition Selected asset rendition we're trying to use
 * @returns {Promise} Resolves when the item has been written to the clipboard.
 */
async function copyToClipboardWithBinary(assetPublicUrl, mimeType, asset, rendition) {
    const clipboardOptions = {};
    if (!CLIPBOARD_SUPPORTED_BINARY_MIMETYPES.includes(mimeType)) {
        const clipboardTargetMimetype = DEFAULT_IMG_MIMETYPE;
        const copiedBlob = await convertImage(assetPublicUrl, clipboardTargetMimetype, asset, rendition);
        const imageSize = copiedBlob.size;
        if (imageSize >= MAX_IMAGE_SIZE_BYTES) {
            console.log(
                `Converted selected rendition (${rendition.width}x${rendition.height}) image file binary is too large (${imageSize} bytes) for copying asset ${asset.path} into clipboard`
            );
            throw new Error(FILE_TOO_LARGE_TXT);
        }
        clipboardOptions[clipboardTargetMimetype] = copiedBlob;
    } else {
        const binary = await fetch(assetPublicUrl);
        if (!binary || !binary.ok) {
            return {
                success: false,
                error: `Unexpected status code ${binary.status} retrieving asset ${asset.path} selected rendition binary`,
            };
        }
        const blob = await binary.blob();
        if (!blob) {
            throw new Error('No blob provided in asset response');
        }
        clipboardOptions[mimeType] = blob;
    }

    const data = [new ClipboardItem(clipboardOptions)];
    await navigator.clipboard.write(data);
    return {
        success: true,
        error: null,
    };
}

/**
 * Write HTML content to the clipboard
 * @param {*} dataToWrite HTML data block to write to the clipboard
 * @returns CLipboard writing promise
 */
/* async */ function writeHtmlToClipboard(dataToWrite) {
    const data = [new ClipboardItem({ 'text/html': new Blob([dataToWrite], { type: 'text/html' }) })];
    return navigator.clipboard.write(data);
}

/**
 * Copies an image to the clipboard as `img` HTML element,
 * with alt text from asset title/description metadata.
 * @param {*} renditionPublicUrl Public URL of the image to retrieve.
 * @param {*} rendition Rendition of the asset that was picked to be used
 * @param {*} asset Original asset (with metadata)
 */
async function copyImageToClipboardAsImgElement(renditionPublicUrl, rendition, asset) {
    let altText = asset.name;
    if (asset._embedded && asset._embedded[ASSET_EMBEDDED_METADATA_PATH]) {
        const altTextMetadata =
            asset._embedded[ASSET_EMBEDDED_METADATA_PATH]['dc:description'] ||
            asset._embedded[ASSET_EMBEDDED_METADATA_PATH]['dc:title'];
        if (altTextMetadata) {
            if (Array.isArray(altTextMetadata) && altTextMetadata.length > 0) {
                altText = altTextMetadata[0];
            } else {
                altText = altTextMetadata;
            }
        }
    }

    await writeHtmlToClipboard(
        `<img width="${rendition.width}" height="${rendition.height}" src="${renditionPublicUrl}" alt="${altText}">`
    );
    return {
        success: true,
        error: null,
    };
}

/**
 * Adds a link to the clipboard with the given name and link
 * @param {*} name
 * @param {*} link
 */
async function copyToClipboardWithLink(name, link) {
    const encodedLink = encodeURI(link); //Encode the link to handle assets name with space.
    await writeHtmlToClipboard(`<a href=${encodedLink}>${name}</a>`);
    return {
        success: true,
        error: null,
    };
}

/**
 * Populates variables in a template string with corresponding values from a context object.
 * @param {string} template - The template string containing variables to replace.
 * @param {object} context - The context object containing values to replace variables.
 * @returns {string} - The template string with variables replaced by corresponding values.
 */
function populateTemplate(template, context) {
    return template.replace(/\${(.*?)}/g, (match, variable) => {
        const keys = variable.split('.'); // Split the variable by '.' to access nested properties
        let value = context;
        for (const key of keys) {
            value = value[key];
            if (value === undefined) {
                break;
            }
        }
        return value !== undefined ? value : match;
    });
}

/**
 * DTD:
 * <!ELEMENT tableTemplate (tr+, style?)>
 * <!ELEMENT tr (td+)>
 * <!ELEMENT td (#PCDATA | a)*>
 * <!ATTLIST tableTemplate
 *           border CDATA #IMPLIED
 *           style CDATA #IMPLIED>
 * <!ATTLIST td
 *           style CDATA #IMPLIED>
 * <!ATTLIST a
 *           href CDATA #IMPLIED>
 *
 * Adds a block to the clipboard with the given name, link and block name
 * EDS block collection: https://www.aem.live/developer/block-collection
 * @param {*} name Name of the asset
 * @param {*} link Link to the asset
 * @param {*} blockName Name of the block
 *
 * @returns Result of the copy operation.
 */
async function copyToClipboardWithBlock(asset, rendition, blockName) {
    const blockTemplate = getConfigValue('blockTemplate', getAssetFormat(asset));
    // Sanitize block template input based on the DTD
    const sanitizedBlockTemplate = blockTemplate?.replace(/<(\/?(?:table|tr|td|a|script)\b)[^>]*(?:\/?)>/g, '<$1>');
    const block = sanitizedBlockTemplate
        ? populateTemplate(sanitizedBlockTemplate, { blockName, asset, rendition })
        : `<table border='1' style="width:100%">
      <tr>
        <td>${blockName}</td>
      </tr>
      <tr>
        <td><a href=${rendition.href}>${asset.name}</a></td>
      </tr>
    </table>`;
    const data = [new ClipboardItem({ 'text/html': new Blob([block], { type: 'text/html' }) })];
    await navigator.clipboard.write(data);
    return {
        success: true,
        error: null,
    };
}

/**
 * Copies an image asset to the clipboard using the R-API using the download rel.
 * @param {Object} asset Asset to copy.
 * @param {Object} rendition Rendition to copy.
 * @returns Result of the copy operation.
 */
async function copyImageAssetWithDownloadRel(asset, rendition) {
    let copyResult = {
        success: false,
        error: null,
    };

    const download = getRel(rendition, REL_DOWNLOAD);

    if (!download?.href) {
        copyResult.error = 'Download error';
        console.error(`Rendition metadata for ${asset.name} does not contain sufficient information to be downloaded`);
        return copyResult;
    }

    const url = download.href; // rendition url, not asset url
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${imsInstance.getImsToken()}`,
        },
    });
    if (!res.ok) {
        copyResult.error = 'Download error: Please retry in a few seconds.';
        console.log(
            `Download error: Download request for rendition binary of asset ${asset.name} failed with status code ${res.status}: ${res.statusText}`
        );
        return copyResult;
    }
    const downloadJson = await res.json();
    if (!downloadJson) {
        copyResult.error = 'Download error: Please retry in a few seconds.';
        console.log(`Download error: Rendition of asset ${asset.name} download JSON not provided`);
        return copyResult;
    }
    if (!downloadJson.href) {
        copyResult.error = 'Download error: Please retry in a few seconds.';
        console.log(`Download error: Rendition of asset ${asset.name} did not contain download link`);
        return copyResult;
    }
    if (isValidHttpsUrl(downloadJson.href)) {
        copyResult = await copyImageToClipboardAsImgElement(downloadJson.href, rendition, asset);
    } else {
        copyResult.error = 'Download error: Please retry in a few seconds.';
        console.log(`Download error: Rendition of asset ${asset.name} did not contain a valid download link`);
    }
    return copyResult;
}

/**
 * Copies a non-image asset to the clipboard using the R-API.
 * @param {*} asset Asset to copy.
 * @returns Result of the copy operation.
 */
async function copyNonImageAsset(asset) {
    // For video assets, place an embed block with link to html rendition in the clipboard
    let rendition;
    if (isVideoAsset(asset)) {
        const blockName = getConfigValue('blockName', getAssetFormat(asset)) || 'embed';
        rendition = getRendition(asset, 'text/html', SUPPORTED_RENDITIONS_FORMATS);
        return rendition
            ? copyToClipboardWithBlock(asset, rendition, blockName)
            : { success: false, error: 'No html rendition!' };
    }
    // For other assets, place link to the rendition with same format as the asset in the clipboard

    rendition = getRendition(asset, getAssetFormat(asset), SUPPORTED_RENDITIONS_FORMATS);
    return rendition
        ? copyToClipboardWithLink(asset.name, rendition.href)
        : { success: false, error: 'No same format rendition!' };
}

/**
 * Copies an image asset to the clipboard using the R-API.
 * @param {*} asset Asset to copy.
 * @param {*} cfg Configuration to use for the copy.
 * @returns Result of the copy operation.
 */
async function copyImageAsset(asset) {
    let copyResult = {
        success: false,
        error: null,
    };

    const rendition = getLargestCopyRendition(asset, SUPPORTED_RENDITIONS_FORMATS);
    if (!rendition) {
        copyResult.error = `No rendition found to copy for ${asset.name}`;
        console.error(`No rendition found to copy for ${asset.name} (${asset.path})`);
        return copyResult;
    }

    if (getConfigValue('copyMode', getAssetFormat(asset)) === 'reference') {
        copyResult = await copyToClipboardWithLink(asset.name, rendition.href);
        if (copyResult.success) {
            return copyResult;
        }
    }

    // Try to copy the rendition using the download rel as image HTML element with alt text
    copyResult = await copyImageAssetWithDownloadRel(asset, rendition);

    // If above didn't help, try to copy the rendition using the href from the rendition metadata
    if (!copyResult.success && rendition.href) {
        copyResult = await copyImageToClipboardAsImgElement(rendition.href, rendition, asset);
        // If above didn't help, try to do binary copy of the rendition using the href from the rendition metadata
        if (!copyResult.success) {
            copyResult = await copyToClipboardWithBinary(rendition.href, rendition.type, asset, rendition);
        }
    }

    return copyResult;
}

/**
 * Copies an asset to the clipboard using the R-API.
 * @param {*} asset Asset to copy.
 * @param {*} cfg Configuration to use for the copy.
 * @returns Result of the copy operation.
 */
async function copyAssetWithRapi(asset) {
    let copyResult = {
        success: false,
        error: null,
    };

    if (!asset) {
        console.log('Asset metadata does not contain sufficient information');
        return copyResult;
    }

    try {
        if (!navigator.clipboard) {
            copyResult.error = 'Unsupported browser.';
            console.log(`Unsupported browser: Missing clipboard API in browser which is needed for asset copy`);
            return copyResult;
        }
        if (isImageAsset(asset)) {
            copyResult = await copyImageAsset(asset);
        } else {
            copyResult = await copyNonImageAsset(asset);
        }
        return copyResult;
    } catch (e) {
        const errorMessage = e.toString();
        if (errorMessage.includes('Document is not focused')) {
            copyResult.error = 'The Asset Selector must remain focused while copying';
        } else if (errorMessage === FILE_TOO_LARGE_TXT) {
            copyResult.error = 'The selected asset file is too large';
        }
        console.log(`Error copying asset ${asset.name} using R-API to clipboard: ${errorMessage}`);
        return copyResult;
    }
}

/**
 * Retrieves the asset selector's containing element.
 * @returns {HTMLElement} The asset selector.
 */
function getAssetSelector() {
    return document.getElementById(ASSET_SELECTOR_ID);
}

/**
 * Makes an HTML element visible.
 * @param {HTMLElement} element Element to be shown.
 */
function showElement(element) {
    element.classList.remove('hidden');
}

/**
 * Makes an HTML element invisible.
 * @param {HTMLElement} element Element to be hidden.
 */
function hideElement(element) {
    element.classList.add('hidden');
}

/**
 * Determines whether an element is already hidden.
 * @param {HTMLElement} element Element to be test.
 * @returns {boolean} True if hidden, false if visible.
 */
function isHidden(element) {
    return element.classList.contains('hidden');
}

/**
 * Reacts to when an asset is selected by copying it to
 * the clipboard.
 * @param {Asset} selected Asset that is now selected.
 * @returns {Promise} Resolves when the operation is complete.
 */
async function onAssetSelected(selected) {
    const selectecMimetype = getAssetFormat(selected) || selected.mimetype;
    const edsProps = getEDSProps(getConfiguration());
    if (
        SUPPORTED_RENDITIONS_FORMATS.includes(selectecMimetype) ||
        SUPPORTED_ASSETS_FORMATS.includes(selectecMimetype)
    ) {
        sampleRUM(SK_PLUGIN_ID, { target: 'asset-library:selected', source: edsProps });
        const copying = document.querySelector('main .toast.copying');
        showElement(copying);
        const copyResult = await copyAssetWithRapi(selected);
        hideElement(copying);
        if (copyResult.success) {
            const messageToastOk = document.querySelector('main .toast.copied');
            showElement(messageToastOk);
            setTimeout(() => hideElement(messageToastOk), TOAST_NOTIFICATION_TIMEOUT);
        } else {
            sampleRUM(SK_PLUGIN_ID, { target: 'asset-library:error', source: edsProps });
            const messageToastError = document.querySelector('main .toast.error-copying');
            if (copyResult.error) {
                messageToastError.textContent = `${copyResult.error}`;
            }
            document.addEventListener('click', () => hideElement(messageToastError), { once: true });
            showElement(messageToastError);
        }
    } else {
        console.log('Unsupported mimetype: ', selectecMimetype);
    }
}

/**
 * Invoked when the currently selected asset in the asset selector has
 * changed. Will invoke onAssetSelected() if there is a selection.
 * @param {Array<Asset>} selection The new selection in the selector.
 */
function handleAssetSelection(selection) {
    document.querySelectorAll('main .toast').forEach((toast) => hideElement(toast));
    if (selection.length) {
        if (selection.length > 1) {
            console.log('Multiple items received in selection, but only the first will be used');
        }
        onAssetSelected(selection[0]);
    }
}

/**
 * Renders the asset selector according to a given configuration.
 * @param {*} cfg
 * @param {*} assetSelectorProps
 * @param {*} repo
 */
function renderAssetSelector(cfg, assetSelectorProps, repo) {
    if (!repo || cfg['repository-id'] !== repo) {
        cfg['repository-id'] = repo;
        // PDFs, Videos are only supported from delivery repositories
        if (isAssetDeliverySupported(cfg)) {
            addPdfSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS);
            addVideoSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS, SUPPORTED_ASSETS_FORMATS);
            addZipSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS);
            addDocxSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS);
            addXlsxSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS);
        } else {
            removePdfSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS);
            removeVideoSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS, SUPPORTED_ASSETS_FORMATS);
            removeZipSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS);
            removeDocxSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS);
            removeXlsxSupport(assetSelectorProps, SUPPORTED_RENDITIONS_FORMATS);
        }
        // eslint-disable-next-line no-undef
        PureJSSelectors.renderAssetSelectorWithAuthFlow(getAssetSelector(), assetSelectorProps);
    }
}

/**
 * This function constructs the URL for fetching the extension configurations.
 *
 * @param {Object} cfg - The configuration object for the Assets Selector. It should contain the `extConfigDomain`, `owner`, and `repo` properties.
 * @returns {string} The URL for fetching the extension configurations.
 */
function getExtensionConfigURL(cfg) {
    const { extConfigDomain, owner, repo, ref } = cfg;
    if (extConfigDomain) {
        return `https://${extConfigDomain}/tools/assets-selector/config.json`;
    } else if (owner && repo) {
        return `https://${ref}--${repo}--${owner}.hlx.live/tools/assets-selector/config.json`;
    }
    return undefined;
}

/**
 * This function processes the configuration options for the Assets Selector Extension.
 *
 * @param {Object} cfg - The configuration object for the Assets Selector. It should contain the `extConfigDomain` property which is used to construct the URL for fetching the extension configurations.
 * @param {Object} assetSelectorProps - The properties object for the Assets Selector.
 */
function processExtensionConfigurations(cfg, assetSelectorProps) {
    const extensionConfigURL = getExtensionConfigURL(cfg);

    if (!extensionConfigURL) {
        return;
    }

    fetch(extensionConfigURL)
        .then((response) => {
            if (!response.ok) {
                console.error('Assets Selector Extension Config: Network response was not ok');
            }
            return response.json();
        })
        .then((data) => {
            const { blockName, copyMode, filterSchema, blockTemplate } = data;

            if (filterSchema) {
                assetSelectorProps.filterSchema = filterSchema;
            }

            assetsSelectorConfigs.blockName = blockName;
            assetsSelectorConfigs.copyMode = copyMode;
            assetsSelectorConfigs.blockTemplate = blockTemplate;
        })
        .catch((error) => {
            console.error('Assets Selector Extension Config: there was a problem fetching the config:', error);
        });
}

/**
 * Renders the asset selector according to a given configuration. The
 * selector will use its IMS flow to ensure that the user has logged
 * in.
 * @param {AssetSelectorConfig} cfg Configuration to use for the
 *  asset selector.
 * @returns {Promise} Resolves when the IMS flow has been initiated.
 */
async function renderAssetSelectorWithImsFlow(cfg) {
    const assetSelectorProps = {
        onSelectRepo: (repo) => renderAssetSelector(cfg, assetSelectorProps, repo),
        handleAssetSelection: (e) => handleAssetSelection(e),
        env: cfg.environment ? cfg.environment.toUpperCase() : 'PROD',
        apiKey: API_KEY,
        rail: cfg.rail ? cfg.rail.toLowerCase() !== 'false' : true,
        runningInUnifiedShell: false,
        noWrap: true,
        theme: 'express',
        aemTierType: ['author', 'delivery'],
        filterSchema: [
            {
                header: 'File Type',
                groupKey: 'TopGroup',
                fields: [
                    {
                        element: 'checkbox',
                        name: 'type',
                        defaultValue: ['directory', 'file'],
                        readOnly: true,
                        options: [
                            {
                                label: 'Directories',
                                value: 'directory',
                            },
                            {
                                label: 'Files',
                                value: 'file',
                            },
                        ],
                    },
                ],
            },
            {
                header: 'Mime Types',
                groupKey: 'MimeTypeGroup',
                fields: [
                    {
                        defaultValue: ['image/jpeg', 'image/png', 'image/tiff'],
                        element: 'checkbox',
                        name: 'type',
                        options: [
                            {
                                label: 'JPG',
                                value: 'image/jpeg',
                            },
                            {
                                label: 'PNG',
                                value: 'image/png',
                            },
                            {
                                label: 'TIFF',
                                value: 'image/tiff',
                            },
                        ],
                        columns: 2,
                    },
                ],
            },
        ],
    };
    if (cfg['ims-org-id']) {
        assetSelectorProps.imsOrg = cfg['ims-org-id'];
    }
    if (cfg['ims-token']) {
        assetSelectorProps.imsToken = cfg['ims-token'];
    }
    if (cfg['repository-id']) {
        assetSelectorProps.repositoryId = cfg['repository-id'];
    }
    if (cfg['aem-tier']) {
        assetSelectorProps.aemTierType = [cfg['aem-tier']];
    }
    processExtensionConfigurations(cfg, assetSelectorProps);
    renderAssetSelector(cfg, assetSelectorProps);
}

/**
 * Retrieves the overlay for the selector's window.
 * @returns {HTMLElement} The selector's main overlay.
 */
function getOverlay() {
    return document.querySelector('.asset-overlay');
}

/**
 * Reacts to receiving an access token by hiding the selector's loading
 * overlay and displaying the selector component.
 * @param {AssetSelectorConfig} cfg The selector's configuration.
 */
function onAccessTokenReceived(cfg) {
    const overlay = getOverlay();
    if (!isHidden(overlay)) {
        hideElement(overlay);
        // calling this shouldn't prompt the user to log in, since they're logged in already
        renderAssetSelectorWithImsFlow(cfg);
    }
}

/**
 * Loads the asset selector by registering the IMS auth service it
 * should use to authorize users.
 * @param {AssetSelectorConfig} cfg Configuration to use for the
 *  selector.
 */
function load(cfg) {
    const imsProps = {
        imsClientId: cfg['ims-client-id'] ? cfg['ims-client-id'] : IMS_CLIENT_ID,
        imsScope: 'additional_info.projectedProductContext,openid,read_organizations,AdobeID,ab.manage',
        redirectUrl: window.location.href,
        modalMode: true,
        imsEnvironment,
        env: imsEnvironment,
        onAccessTokenReceived: () => onAccessTokenReceived(cfg),
    };
    // eslint-disable-next-line no-undef
    const registeredTokenService = PureJSSelectors.registerAssetsSelectorsAuthService(imsProps);
    imsInstance = registeredTokenService;
}

/**
 * Does the work of logging out of IMS.
 * @returns {Promise} Resolves when logout has finished.
 */
async function logoutImsFlow() {
    return imsInstance.signOut();
}

/**
 * Loads the asset selector's script file
 * @param {*} cfg
 * @param {*} cb
 */
function loadAssetSelectorMFE(cfg, cb) {
    // ensure that when loading the asset selector script, it's loaded using
    // the same host as the current page. this is to avoid cross-host loading
    let loadUrl = AS_MFE_PATH;
    const regex = new RegExp(HOST_REGEX);
    if (!regex.test(document.location.hostname)) {
        // default to loading from experience.adobe.com if not already
        // running from an experience.adobe.com domain
        loadUrl = `${AS_MFE_DEFAULT_HOST}${AS_MFE_PATH}`;
    }
    loadScript(loadUrl, () => {
        load(cfg);
        if (cb) {
            cb();
        }
    });
}

/**
 * Initializes the asset selector by loading its script file, and registering
 * the IMS auth service it should use to authenticate with IMS.
 * @param {AssetSelectorConfig} cfg Configuration for the selector.
 * @param {function} [cb] If provided, will be invoked after
 *  all initialization steps are complete.
 */
function utilInit(cfg, cb) {
    if (cfg.environment) {
        if (cfg.environment.toUpperCase() === 'STAGE') {
            imsEnvironment = IMS_ENV_STAGE;
        } else if (cfg.environment.toUpperCase() === 'PROD') {
            imsEnvironment = IMS_ENV_PROD;
        } else {
            throw new Error('Invalid environment setting!');
        }
    }
    loadAssetSelectorMFE(cfg, cb);
}

/**
 * Initializes the renderer for the asset selector integration.
 */
async function init() {
    const cfg = getConfiguration();
    sampleRUM(SK_PLUGIN_ID, { target: 'asset-library:init', source: getEDSProps(cfg) });
    const overlay = getOverlay();
    overlay.querySelector('#as-login').addEventListener(
        'click',
        () => {
            renderAssetSelectorWithImsFlow(cfg);
        },
        { passive: true }
    );

    const logout = document.getElementById('as-cancel');
    logout.addEventListener('click', logoutImsFlow, { passive: true });

    // give a little time for onAccessTokenReceived() to potentially come in
    setTimeout(() => {
        if (!isHidden(overlay)) {
            // at this point the overlay is still visible, meaning that we haven't
            // gotten an event indicating the user is logged in. Display the
            // sign in interface
            overlay.classList.remove('loading');
            hideElement(overlay.querySelector('#loading'));
            showElement(overlay.querySelector('#login'));
        }
    }, LOGIN_TIMEOUT);

    utilInit(cfg);
}

init();
