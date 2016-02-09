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

    function intcmp(a, b) { return (a < b) ? -1 : ((a > b) ? 1 : 0); }

    /**
     * Calculate Nx (actually Nx length or Lx, unless `length` is false)
     * for an array
     *
     * Arguments:
     *   arr (Array): array of integers
     *   pct (Array): array of percentiles to calculate
     *   length (bool): If true (default), return contig length (or Lx), if false return its index
     *
     * Return:
     *   Object with (string) keys being the percentiles, and values
     *   being the appropriate value. e.g. for pct = [50], output is {'50': <value> }
     */
    function nx(arr, pct, length) {
        // Sanity checks and initialization
        if (arr.length == 0) {
            throw new Error('Nx of empty array is undefined');
        }
        var result = {};

        // set default length and check that it is boolean
        if (length === undefined) {
            length = true;
        }
        if (typeof(length) != 'boolean') {
            throw new TypeError('length (' + length + ') is not a boolean');
        }

        // Calculate total sum of array values, and also
        // for convenience pre-calculate half of that value.
        var total = 0;
        arr.forEach(function(num){ total += num });

        // Construct cutoff values for Nx, for each x in `pct`.
        var cutoffs = [];
        pct.sort(intcmp);
        pct.forEach(function(num){
            if (num < 1 || num > 100) {
                throw new Error('Nx is not defined for x=' + num);
            }
            cutoffs.push(total * (num / 100.0));
        });

        // Find all percentiles of cumulative sum of array
        arr.sort(intcmp);
        var i = arr.length, j=0, n = 0, r = -1;
        while (j < cutoffs.length && i > 0) {
            i -= 1;
            n += arr[i];
            // See if we have enough 'mass' for any cutoffs
            while (n >= cutoffs[j]) {
                // If the last (middle) value is exactly half, then take the
                // average of the two middle values. Otherwise just use the value.
                if (n == cutoffs[j] && i > 0) {
                    r = length ? (arr[i] + arr[i - 1]) / 2.0 : i - 0.5;
                }
                else {
                    r = length ? arr[i] * 1.0 : i;
                }
                result[pct[j]] = r;
                j += 1;
            }
        }
        // Set any trailing cutoffs
        while (j < cutoffs.length) {
            result[pct[j]] = length ? arr[0] * 1.0 : 0;
            j += 1;
        }

        return result;
    }

    // internal test code
    function test_nx() {
        var a, t0, t1,r;

        a = [ 2, 2, 2, 3, 3, 4, 8, 8,]
        console.log('Lx of', a, 'is', nx(a, [10,50,90]))

        console.log('L1 of', a, 'is', nx(a, [1])['1'], 'and expected to be 8');
        console.log('N99 of', a, 'is', nx(a, [99], false)['99'], 'and expected to be 0');
        console.log('N50 of', a, 'is', nx(a, [50], false)['50'], 'and expected to be 5.5');

        // bigger
        a = [];
        var n = 1000000;
        for (var i=0; i < n/2; i++) {
            a.push(1);
        }
        for (var i=n/2; i < n; i++) {
            a.push(2);
        }

        console.log('Running Nx=1,50,99 on ' + n + ' elements');
        t0 = Date.now();
        r = nx(a, [1, 50, 99]);
        t1 = Date.now();
        console.log('Result:', r, 'in ' + (t1 - t0) / 1000.0 + ' seconds');

        // this should fail
        console.log('\n\nHere comes the CRASH!');
        nx(a, [999]);
    }
    //test_nx();

    return {
        getRef: getRef,
        nx: nx
    };
});