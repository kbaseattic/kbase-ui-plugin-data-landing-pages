/*global define*/
/*jslint white:true,browser:true*/
define([
    'kb/common/html'
], function (html) {
    'use strict';
    function getRef(params) {
        if (params.ref) {
            return params.ref;
        }
        if (params.workspaceId) {
            if (!params.objectId) {
                throw new Error('Object id required if workspaceId supplied');
            }
            var ref = [params.workspaceId, params.objectId];
            if (params.objectVersion) {
                ref.push(params.objectVersion);
            }
            return ref.join('/');
        }
        throw new Error('Either a ref property or workspaceId, objectId, and optionally objectVersion required to make a ref');
    }
    return {
        getRef: getRef
    };
});