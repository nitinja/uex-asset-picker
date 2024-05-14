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

import { getRel, REL_RENDITIONS } from './asset-links.js';

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
 * Retrieves the rendition that should be copied into the clipboard for
 * the given asset.
 * @param {Asset} asset Asset whose copy rendition should be retrieved.
 * @returns {Rendition} Rendition whose content should be copied to
 *  the clipboard. Will return a falsy value if no suitable rendition
 *  could be found.
 */
export function getLargestCopyRendition(asset, supportedRenditionFormats) {
    let maxRendition = null;
    const renditions = getRel(asset, REL_RENDITIONS);
    if (!renditions) {
        return maxRendition;
    }

    renditions.forEach((rendition) => {
        if (
            supportedRenditionFormats.includes(rendition.type) &&
            (!maxRendition || maxRendition.width < rendition.width)
        ) {
            maxRendition = rendition;
        }
    });
    return maxRendition;
}

/**
 * Gets the rendition with the specified format
 * @param {Object} asset Asset to get the rendition from
 * @param {string} format Format of the rendition to get
 * @returns Rendition with the specified format
 */
export function getRendition(asset, format, supportedRenditionFormats) {
    const renditions = getRel(asset, REL_RENDITIONS);
    if (!renditions) return undefined;
    return renditions.find(
        (rendition) => supportedRenditionFormats.includes(rendition.type) && rendition.type === format
    );
}
