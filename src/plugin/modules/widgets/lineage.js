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
                t = html.tag, ol = t('ol'), ul = t('ul'),
                li = t('li'),
                a = t('a'),
                div = t('div'),
                pre = t('pre'),
                span = t('span'),
                tbl = t('table'), td = t('td'), tr = t('tr'), t;

            function unknown_html() {
                return 'unknown';
            }

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                       title: 'Overview',
                       content: tbl({class: 'table table-striped'},[
                           tr([td('NCBI taxonomic ID'), td({dataElement: 'ncbi-id'}, html.loading())]),
                           tr([td('Scientific name'), td({dataElement: 'scientific-name'}, html.loading())]),
                           tr([td('Kingdom'), td({dataElement: 'kingdom'}, html.loading())])
                       ])
                    }),
                    html.makePanel({
                        title: 'Scientific Lineage',
                        content: div([
                            div({class: 'kb-data-bold', dataElement: 'scientific-lineage-name'}, html.loading()),
                            div({dataElement: 'lineage'}, html.loading())
                        ])
                    })
                ]);
            }

            function setDataElementHTML(element, value) {
                var elt = container.querySelector('[data-element="' + element + '"]');
                if (elt === null) {
                    elt.innerHTML =  unknown_html();
                }
                else {
                    elt.innerHTML = value;
                }
            }

            function renderLineage(lineage) {
                var list_o_links = pre([
                    ol(lineage.map(function (item, index) {
                        var url = 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name=' + item.trim(' ');
                        return li({style: {paddingLeft: String(index * 10) + 'px'}}, [
                            a({href: url, target: '_blank'}, item.trim(' '))]);
                    }))
                ]);
                setDataElementHTML('lineage', list_o_links);
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
                        setDataElementHTML('scientific-name', scientificName);
                        setDataElementHTML('scientific-lineage-name', scientificName);
                        return taxon.scientific_lineage();
                    })
                    .then(function (lineage) {
                        renderLineage(lineage);
                        return taxon.kingdom();
                    })
                    .then(function(kingdom) {
                        setDataElementHTML('kingdom', kingdom);
                        return taxon.taxonomic_id();
                    })
                    .then(function(taxid) {
                        setDataElementHTML('ncbi-id', taxid);
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