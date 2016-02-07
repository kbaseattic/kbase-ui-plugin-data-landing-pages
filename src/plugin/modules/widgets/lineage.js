/*global define */
/*jslint white: true, browser: true */
define([
    'kb/common/html',
    'kb/data/taxon',
    '../utils',
    'bluebird'
],
    function (html, Taxon, utils, bluebird) {
        'use strict';


        function factory(config) {
            var parent, container, runtime = config.runtime,
                t = html.tag, ol = t('ol'), ul = t('ul'),
                li = t('li'),
                a = t('a'),
                div = t('div'),
                templates = {
                    overview: "<div class='row'>"
                            + "    <div class='col-md-6'>"
                            + "        <table class='table table-bordered'>"
                            + "            <tr><td><b>NCBI taxonomic ID</b></td><td data-element='ncbi-id'></td></tr>"
                            + "            <tr><td><b>Scientific name</b></td><td data-element='scientific-name'></td></tr>"
                            + "            <tr><td><b>Kingdom</b></td><td data-element='kingdom'></td></tr>"
                            + "            <tr><td><b>Genetic Code</b></td><td data-element='genetic-code'></td></tr>"
                            + "            <tr><td><b>Aliases</b></td><td data-element='aliases'></td></tr>"                          
                            + "        </table>"
                            + "    </div>"
                            + "    <div class='col-md-6' data-element='lineage'>"
                            + "    </div>"
                            + "</div>"
                };

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Overview',
                        content: div({dataElement: 'overview'}, html.loading())
                    }),
                    html.makePanel({
                        title: 'Children Taxons',
                        content: div({dataElement: 'taxonChildren'}, html.loading())
                    }),                    
                    html.makePanel({
                        title: 'Additional Information',
                        content: div({dataElement: 'moreInfo'})
                    })
                ]);
            }

            function setDataElementHTML(element, value) {
                try {
                    container.querySelector("[data-element='" + element + "']").innerHTML = value;
                }
                catch (err) {
                    console.log("ERROR");
                    throw err;
                }
            }

            function renderLineage(name, name_lineage, ref_lineage) {
                //var url = 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name=' + item.trim(' ');
                var list_o_links = [], i, len = name_lineage.length;
                
                for (i = 0; i < len; i+=1) {
                    list_o_links.push("<div style='padding-left: " + String(i * 10) + "px'>"
                                    + "<a target='_blank' href='#dataview/" + ref_lineage[i] + "'>"
                                    + name_lineage[i] + "</a></div>");
                }
                list_o_links.push("<div style='padding-left: " + String(len * 10) + "px'>" + name + "</div>");
                
                setDataElementHTML('lineage', div([div("<h5><strong>Classification</strong></h5>"),
                                                   div(list_o_links)]));
            }
            
            function renderChildren(info) {
                var list_o_links = [], i, len = info.length;
                for (i = 0; i < len; i+=1) {
                    list_o_links.push("<div><a target='_blank' href='#dataview/" + info[i][1] + "'>"
                                    + info[i][0] + "</a></div>");
                }
                
                setDataElementHTML('taxonChildren', div(list_o_links));
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
                
                container.querySelector('div[data-element="overview"]').innerHTML = templates.overview;
                var i,
                    emptyElements,
                    len,
                    taxon_ref = utils.getRef(params),
                    taxon,
                    scientific_name;
                
                emptyElements = container.querySelectorAll("td[data-element]");
                len = emptyElements.length;
                
                for (i = 0; i < len; i+=1) {
                    emptyElements[i].innerHTML = html.loading();
                }
                
                function getTaxonClient(ref) {
                    return Taxon.client({
                        url: runtime.getConfig('services.taxon_api.url'),
                        token: runtime.service('session').getAuthToken(),
                        ref: ref
                    });
                }
                
                taxon = getTaxonClient(taxon_ref);
                                       
                return taxon.scientific_name().then(function (scientificName) {
                        setDataElementHTML('scientific-name', scientificName);
                        scientific_name = scientificName;
                        return taxon.scientific_lineage();
                    })
                    .then(function (lineage) {
                        var refLineage = [];
                        
                        function recursiveGetParent(t) {
                            return t.parent().then(function (parent_ref) {
                                if (parent_ref !== undefined) {
                                    refLineage.unshift(parent_ref);
                                    return recursiveGetParent(getTaxonClient(parent_ref));
                                }
                                else {
                                    // remove the 'root' element
                                    refLineage.splice(0,1);
                                    return [lineage, refLineage];
                                }
                            });
                        }
                        
                        return recursiveGetParent(taxon);
                    })
                    .then(function(lineages) {
                        renderLineage(scientific_name, lineages[0], lineages[1]);
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
                        setDataElementHTML('aliases', aliases);
                        return taxon.children();
                    })
                    .then(function(children_refs) {
                        var children_info = [];
                        
                        return bluebird.all(children_refs.map(function (ref) {
                            return getTaxonClient(ref).scientific_name().then(function (name) {
                                return [name, ref];
                            });
                        }));    
                    })
                    .then(function (childrenInfo) {
                        renderChildren(childrenInfo);
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