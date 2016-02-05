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
                tbl = t('table'), td = t('td'), tr = t('tr');

            function unknown_html() {
                return 'unknown';
            }

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Overview',
                        content: div({style: {'class': "table"}}, tbl({'class': 'table table-bordered'},[
                            tr([td('<b>NCBI taxonomic ID</b>'), td({dataElement: 'ncbi-id'}, html.loading())]),
                            tr([td('<b>Scientific name</b>'), td({dataElement: 'scientific-name'}, html.loading())]),
                            tr([td('<b>Kingdom</b>'), td({dataElement: 'kingdom'}, html.loading())]),
                            tr([td('<b>Genetic Code</b>'), td({dataElement: 'genetic-code'}, html.loading())]),
                            tr([td('<b>Aliases</b>'), td({dataElement: 'aliases'}, html.loading())])                          
                        ]),
                        div({dataElement: 'lineage'}, html.loading()))
                    }),
                    html.makePanel({
                        title: 'Additional Information',
                        content: div([
                            div({dataElement: 'wikiEntry'}, html.loading())
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

            function renderLineage(name, name_lineage, ref_lineage) {
                //var url = 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name=' + item.trim(' ');
                var list_o_links = [];
                
                for (var i=ref_lineage.length; i > 0; i--) {
                    list_o_links.push(div({style: {paddingLeft: String(i * 10) + 'px'}}, [
                        a({href: '#dataview/' + ref_lineage[i].trim(' '), target: '_blank'},
                          name_lineage[i].trim(' '))
                        ]));
                }
                list_o_links.push(div({style: {paddingLeft: '0px'}}, name));
                
                /*
                div([name, ref_lineage.map(function (item, index) {
                        var url = '#dataview/' + item.trim(' ');
                        return div({style: {paddingLeft: String(index * 10) + 'px'}}, [
                            a({href: url, target: '_blank'}, item.trim(' '))]);
                    })]);
                */
                
                setDataElementHTML('lineage', div(list_o_links));
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
                
                function getTaxonClient(ref) {
                    return Taxon.client({
                        url: runtime.getConfig('services.taxon_api.url'),
                        token: runtime.service('session').getAuthToken(),
                        ref: ref
                    });
                }
                                
                var taxon_ref = utils.getRef(params),
                    taxon = getTaxonClient(taxon_ref);
                
                return taxon.scientific_name().then(function (scientificName) {
                        setDataElementHTML('scientific-name', scientificName);
                        return [scientificName, taxon.scientific_lineage()];
                    })
                    .then(function (nameAndLineage) {
                        var refLineage = [];
                        
                        function recursiveGetParent(t) {
                            return t.parent().then(function (parent_ref) {
                                var next_ref;
                                
                                try {
                                    next_ref = getTaxonClient(parent_ref);
                                    refLineage.push(parent_ref);
                                    recursiveGetParent(next_ref);
                                } catch(error) {
                                    ;
                                }
                                
                                return;
                            })
                        }
                        
                        recursiveGetParent(taxon);
                        renderLineage(nameAndLineage[0], nameAndLineage[1], refLineage);
                        return taxon.kingdom();
                    })
                    .then(function(kingdom) {
                        setDataElementHTML('kingdom', kingdom);
                        return taxon.taxonomic_id();
                    })
                    .then(function(taxid) {
                        setDataElementHTML('ncbi-id', taxid);
                        return taxon.genetic_code();
                    })
                    .then(function(geneticCode) {
                        setDataElementHTML('genetic-code', geneticCode);
                        return taxon.aliases();
                    })
                    .then(function(aliases) {
                        setDataElementHTML('aliases',aliases); 
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