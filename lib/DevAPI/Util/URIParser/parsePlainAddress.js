/*
 * Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved.
 *
 * MySQL Connector/Node.js is licensed under the terms of the GPLv2
 * <http://www.gnu.org/licenses/old-licenses/gpl-2.0.html>, like most
 * MySQL Connectors. There are special exceptions to the terms and
 * conditions of the GPLv2 as it is applied to this software, see the
 * FLOSS License Exception
 * <http://www.mysql.com/about/legal/licensing/foss-exception.html>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; version 2 of the
 * License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

'use strict';

module.exports = parse;

/**
 * Parse a single address without an explicit priority.
 * @private
 * @param {string} input - formatted address string
 * @throws {Error} When the host is not valid.
 * @returns {Address} Object containing the address details.
 * @example
 * const ipv6Address = '[::1]:33060'
 * const ipv4Address = '127.0.0.1:33060'
 * const cnAddress = 'localhost:33060'
 */
function parse (input) {
    // hostMatch will always contain something
    const hostMatch = decodeURIComponent(input).trim().match(/\(?([./][^)]+)\)?|\[(.+)\]|([^:]+)/);
    const portMatch = decodeURIComponent(input).trim().match(/:([^[\]]+)$/) || [];

    const isInvalid = hostMatch[1] && !isLocalFile(hostMatch[1]) ||
        hostMatch[2] && !isIPv6(hostMatch[2]) ||
        hostMatch[3] && !isIPv4(hostMatch[3]) && !isCommonName(hostMatch[3]);

    if (isInvalid) {
        throw new Error('Invalid URI');
    }

    const socket = hostMatch[1];

    // hostMatch[1] should contain an IPv6 address match
    // hostMatch[2] should contain a non-IPv6 address match
    const host = hostMatch[2] || hostMatch[3];

    const address = { host, socket };
    const portNum = parseInt(portMatch[1], 10);
    address.port = !isNaN(portNum) ? portNum : portMatch[1];

    return address;
}

/**
 * Check if a host is a valid IPv6 address.
 * @private
 * @param {string} input - host
 * @returns {Boolean}
 */
function isIPv6 (input) {
    const decOctet = '([0-9]|[1-9][0-9]|1[0-9]{0,2}|2[0-4][0-9]|25[0-5])';
    const h16 = '([0-9A-Fa-f]{1,4})';
    const ipv4Address = `(${decOctet}\\.){3}${decOctet}`;
    const ls32 = `(${h16}:${h16}|${ipv4Address})`;
    const ipv6Address = [
        `(${h16}:){6}${ls32}`,
        `(::${h16}:){5}${ls32}`,
        `${h16}?::(${h16}:){4}${ls32}`,
        `(${h16}:)?${h16}?::(${h16}:){3}${ls32}`,
        `(${h16}:){0,2}${h16}?::(${h16}:){2}${ls32}`,
        `(${h16}:){0,3}${h16}?::${h16}:${ls32}`,
        `(${h16}:){0,4}${h16}?::${ls32}`,
        `(${h16}:){0,5}${h16}?::${h16}`,
        `(${h16}:){0,6}${h16}?::`
    ].join('|');

    return (new RegExp(ipv6Address)).test(input);
}

/**
 * Check if a host is a valid IPv4 address.
 * @private
 * @param {string} input - host
 * @returns {Boolean}
 */
function isIPv4 (input) {
    const decOctet = '([0-9]|[1-9][0-9]|1[0-9]{0,2}|2[0-4][0-9]|25[0-5])';
    const ipv4Address = `^(${decOctet}\\.){3}${decOctet}$`;

    return (new RegExp(ipv4Address)).test(input);
}

/**
 * Check if a host is a valid common name (RFC 3896 `reg-name`).
 * @private
 * @param {string} input - host
 * @returns {Boolean}
 */
function isCommonName (input) {
    const commonName = '^[a-zA-Z0-9-._~!$&\'()*+,;=]+$';

    return (new RegExp(commonName)).test(input);
}

/**
 * Check if a host is a valid local file path.
 * @private
 * @param {string} input - local file path
 * @returns {Boolean}
 */
function isLocalFile (input) {
    return true;
}
