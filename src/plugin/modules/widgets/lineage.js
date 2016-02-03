/*global define */
/*jslint white: true, browser: true */
define([
    'kb/common/html',
    'kb/data/taxon',
    '../utils'
],
    function (html, Taxon, utils) {
        'use strict';

        function factory(config) {
            var parent, container, runtime = config.runtime,
                t = html.tag, ol = t('ol'),
                li = t('li'),
                a = t('a'),
                div = t('div'),
                pre = t('pre');

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Scientific Lineage',
                        content: div([
                            div({style: {fontWeight: 'bold', color: 'green'}, dataElement: 'scientificName'}, html.loading()),
                            div({dataElement: 'lineage'}, html.loading())
                        ])
                    }), 
                    html.makePanel({title: 'Dumb panel', content: '<p>Hello</p>'})
                ]);
            }

            function renderScientificName(scientificName) {
                container.querySelector('[data-element="scientificName"]').innerHTML = scientificName;
            }

            function renderLineage(lineage) {
                var content = pre([
                    ol(lineage.map(function (item, index) {
                        var url = 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name=' + item.trim(' ');
                        return li({style: {paddingLeft: String(index * 10) + 'px'}}, [
                            a({href: url, target: '_blank'}, item.trim(' '))]);
                    }))
                ]);

                container.querySelector('[data-element="lineage"]').innerHTML = content;
            }

            // WIDGET API

            function attach(node) {
                parent = node;
                container = parent.appendChild(document.createElement('div'));
                container.innerHTML = layout();
            }

            function start(params) {
                /* Need to create the taxon client object here because it requires params.
                 * The params is determined by the dataview route, which makes
                 * available:
                 *   workspaceId
                 *   objectId
                 *   objectVersion
                 *   ...
                 */
                var taxon = Taxon.client({
                    url: runtime.getConfig('services.taxon_api.url'),
                    token: runtime.service('session').getAuthToken(),
                    ref: utils.getRef(params)
                });
                return taxon.scientific_name()
                    .then(function (scientificName) {
                        renderScientificName(scientificName);
                        return taxon.scientific_lineage();
                    })
                    .then(function (lineage) {
                        renderLineage(lineage);
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