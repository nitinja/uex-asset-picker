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

export const REL_RENDITIONS = 'http://ns.adobe.com/adobecloud/rel/rendition';
export const REL_DOWNLOAD = 'http://ns.adobe.com/adobecloud/rel/download';

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
 * URL validity checks
 * @param {*} inputURL URL to validate
 * @returns true if the URL is valid, false otherwise
 */
export function isValidHttpsUrl(inputURL) {
    let testedUrl;
    try {
        testedUrl = new URL(inputURL);
    } catch (error) {
        return false;
    }
    return testedUrl.protocol === 'https:';
}

/**
 * Retrieves the value of a rel from repository metadata.
 * @param {Asset|Rendition} repositoryMetadata Metadata whose links
 *  will be used.
 * @param {string} rel The rel to retrieve.
 */
export function getRel(repositoryMetadata, rel) {
    if (!repositoryMetadata?._links) {
        return undefined;
    }
    // eslint-disable-next-line no-underscore-dangle
    return repositoryMetadata._links[rel];
}
