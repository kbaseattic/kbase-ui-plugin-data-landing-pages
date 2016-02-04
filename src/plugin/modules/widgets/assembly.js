/*global define */
/*jslint white: true, browser: true */
define([
    'kb/common/html',
    'kb/data/assembly',
    '../utils'
],
    function (html, Assembly, utils) {
        'use strict';

        function factory(config) {
            var parent, container, runtime = config.runtime,
                t = html.tag, ol = t('ol'),
                li = t('li'),
                a = t('a'),
                div = t('div'),
                pre = t('pre'),
                table = t('table'),
                tr = t('tr'),
                td = t('td');

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Overview',
                        content: "<table class='table'>"
                               + "    <tr><td>Number of Contigs</td><td data-element='numContigs'>html.loading()</td></tr>"
                               + "    <tr><td>Total DNA Size</td><td data-element='dnaSize'>html.loading()</td></tr>"
                               + "    <tr><td>GC %</td><td data-element='gc'>html.loading()</td></tr>"
                               + "</table>"
                    }),
                    html.makePanel({
                        title: 'Data Quality',
                        content: div([
                            div({dataElement: 'plot1'}, "Plot1"),
                            div({dataElement: 'plot2'}, "Plot2")
                        ])
                    })
                ]);
            }

            function renderNumContigs(numContigs) {
                container.querySelector('[data-element="numContigs"]').innerHTML = numContigs;
            }

            function renderDNASize(dnaSize) {
                container.querySelector('[data-element="dnaSize"]').innerHTML = dnaSize;
            }

            function renderGC(gc) {
                container.querySelector('[data-element="gc"]').innerHTML = gc * 100.0;
            }

            // WIDGET API

            function attach(node) {
                parent = node;
                container = parent.appendChild(document.createElement('div'));
                container.innerHTML = layout();
            }

            function start(params) {
                /* Need to create the assembly client object here because it requires params.
                 * The params is determined by the dataview route, which makes
                 * available:
                 *   workspaceId
                 *   objectId
                 *   objectVersion
                 *   ...
                 */
                var assembly = Assembly.client({
                    url: runtime.getConfig('services.assembly_api.url'),
                    token: runtime.service('session').getAuthToken(),
                    ref: utils.getRef(params)
                });
                return assembly.number_contigs()
                    .then(function (numContigs) {
                        renderNumContigs(numContigs);
                        return assembly.dna_size();
                    })
                    .then(function (dnaSize) {
                        renderDNASize(dnaSize);
                        return assembly.gc_content();
                    })
                    .then(function (gc) {
                        renderGC(gc);
                    });
            }

            function stop() {
                // nothing to do
                // typically this is where one would 
            }

            function detach() {
                // nothing to do necessarily, since the parent dom node will
                // be removed the controller for this widget removes it, 
                // but it is nice to take responsibility for undoing what we
                // changed in the parent node:
                if (parent && container) {
                    container.innerHTML = '';
                    parent.removeChild(container);
                }
            }

            return Object.freeze({
                attach: attach,
                start: start,
                stop: stop,
                detach: detach
            });
        }

        return {
            make: function (config) {
                return factory(config);
            }
        };
    });