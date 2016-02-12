/*global define */
/*jslint white: true, browser: true */
define([
    'kb/common/html',
    'kb/data/genomeAnnotation',
    'kb/data/taxon',
    'kb/data/assembly',
    '../utils',
    'numeral',
    'handlebars',
    'plotly'
],
    function (html, GenomeAnnotation, Taxon, Assembly, utils, numeral, handlebars, plotly) {
        'use strict';

        function factory(config) {
            var parent,
                container,
                runtime = config.runtime,
                div = html.tag('div'),
                panelTemplates = {
                    overview: handlebars.compile("<div class='row'>"
                            + "    <div class='col-md-6'>"
                            + "        <div>"
                            + "            <strong><span data-element='taxonLink'></span></strong>"
                            + "            <table class='table table-bordered'>"
                            + "                <tr>"
                            + "                    <td><b>NCBI taxonomic ID</b></td>"
                            + "                    <td data-element='taxonId'></td>"
                            + "                </tr>"
                            + "                <tr>"
                            + "                    <td><b>Scientific Name</b></td>"
                            + "                    <td data-element='taxonName'></td>"
                            + "                </tr>"
                            + "                <tr>"
                            + "                    <td><b>Kingdom</b></td>"
                            + "                    <td data-element='kingdom'></td>"
                            + "                </tr>"
                            + "                <tr>"
                            + "                    <td><b>Genetic Code</b></td>"
                            + "                    <td data-element='geneticCode'></td>"
                            + "                </tr>"
                            + "                <tr>"
                            + "                    <td><b>Aliases</b></td>"
                            + "                    <td data-element='aliases'></td>"
                            + "                </tr>"
                            + "            </table>"
                            + "            <strong><span data-element='assemblyLink'></span></strong>"
                            + "            <table class='table table-bordered'>"
                            + "                <tr>"
                            + "                    <td><b>Number of Contigs</b></td>"
                            + "                    <td data-element='numContigs'></td>"
                            + "                </tr>"
                            + "                <tr>"
                            + "                    <td><b>Total DNA Size</b></td>"
                            + "                    <td data-element='dnaSize'></td>"
                            + "                </tr>"
                            + "                <tr>"
                            + "                    <td><b>GC %</b></td>"
                            + "                    <td data-element='gc'></td>"
                            + "                </tr>"
                            + "            </table>"
                            + "        </div>"
                            + "    </div>"
                            + "    <div class='col-md-6'>"
                            + "        <div id='featureTypesPlot'></div>"
                            + "    </div>"
                            + "</div>"),
                    annotations: handlebars.compile("<div class='row'>"
                                                  + "    <div class='col-md-2'>"
                                                  + "        <input type='text' class='form-control' placeholder='feature type'/>"
                                                  + "    </div>"
                                                  + "    <div class='col-md-6'>"
                                                  + "        <table class='table table-bordered table-striped'>"
                                                  + "            <thead>"
                                                  + "                <tr>"
                                                  + "                    <th>type</th>"
                                                  + "                    <th>id</th>"
                                                  + "                    <th>length</th>"
                                                  + "                    <th>function</th>"
                                                  + "                    <th>locations</th>"
                                                  + "                </tr>"
                                                  + "            </thead>"
                                                  + "            <tbody>"
                                                  + "                {{#each featureData}}"
                                                  + "                    <tr>"
                                                  + "                        <td>{{feature_type}}</td>"
                                                  + "                        <td>{{feature_id}}</td>"
                                                  + "                        <td>{{feature_dna_sequence_length}}</td>"
                                                  + "                        <td>{{feature_function}}</td>"
                                                  + "                        <td>"
                                                  + "                        <table class='table'>"
                                                  + "                            <thead>"
                                                  + "                                <td>contig_id</td>"
                                                  + "                                <td>start</td>"
                                                  + "                                <td>strand</td>"
                                                  + "                                <td>length</td>"
                                                  + "                            </thead>"
                                                  + "                            <tbody>"
                                                  + "                            {{#each feature_locations}}"
                                                  + "                            <tr>"
                                                  + "                                <td>{{contig_id}}</td>"
                                                  + "                                <td>{{start}}</td>"
                                                  + "                                <td>{{strand}}</td>"
                                                  + "                                <td>{{length}}</td>"
                                                  + "                            </tr>"
                                                  + "                            {{/each}}"
                                                  + "                            </tbody>"
                                                  + "                        </table>"
                                                  + "                        </td>"
                                                  + "                    </tr>"
                                                  + "                {{/each}}"
                                                  + "            </tbody>"
                                                  + "        </table>"
                                                  + "    </div>"
                                                  + "</div>"),
                    quality: handlebars.compile("<div class='row'>"
                                              + "</div>")
                };

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Overview',
                        content: div({id: 'overview'}, panelTemplates.overview())
                    }),
                    html.makePanel({
                        title: 'Structural and Functional Annotations',
                        content: div({id: 'annotationInfo'}, html.loading())
                    }),
                    html.makePanel({
                        title: 'Genome Annotation Quality',
                        content: div({id: 'qualityInfo'}, "")
                    })
                ]);
            }

            function renderFeatureDataTable(data) {
                container.querySelector("[id='annotationInfo']").innerHTML = panelTemplates.annotations({featureData: data});
            }
                                    
            function renderFeatureTypesPlot(ftypes, fcounts) {                
                var data = [{
                    type: 'bar',
                    orientation: 'v',
                    x: ftypes,
                    y: fcounts
                }],
                plot_layout = {
                    title: '<b>Features</b>',
                    fontsize: 24,
                    xaxis: {
                        title: '<b>Feature Type</b>'
                    },
                    yaxis: {
                        zeroline: true,
                        title: '<b>Count</b>'
                    },
                    aspectratio: {
                        x: 4,
                        y: 3
                    }
                };
                
                plotly.newPlot('featureTypesPlot', data, plot_layout);
            }
            
            function renderAssemblyLink(ref) {
                container.querySelector('[data-element="assemblyLink"]').innerHTML = "<a href='#dataview/" + ref + "'>Assembly</a>";
            }

            function renderNumberContigs(numContigs) {
                container.querySelector('[data-element="numContigs"]').innerHTML = numeral(numContigs).format('0,0');
            }

            function renderDNASize(dnaSize) {
                container.querySelector('[data-element="dnaSize"]').innerHTML = numeral(dnaSize).format('0,0');
            }
            
            function renderGC(gc) {
                container.querySelector('[data-element="gc"]').innerHTML = numeral(gc).format('0.00%');
            }
            
            function renderTaxonLink(ref) {
                container.querySelector('[data-element="taxonLink"]').innerHTML = "<a href='#dataview/" + ref + "'>Taxon</a>";
            }
            
            function renderTaxId(taxId) {
                container.querySelector('[data-element="taxonId"]').innerHTML = taxId;
            }
            
            function renderScientificName(scientificName) {
                container.querySelector('[data-element="taxonName"]').innerHTML = scientificName;
            }

            function renderKingdom(kingdom) {
                container.querySelector('[data-element="kingdom"]').innerHTML = kingdom;
            }
            
            function renderGeneticCode(geneticCode) {
                container.querySelector('[data-element="geneticCode"]').innerHTML = geneticCode;
            }
            
            function renderAliases(aliases) {
                container.querySelector('[data-element="aliases"]').innerHTML = aliases;
            }
            
            // WIDGET API

            function attach(node) {
                parent = node;
                container = parent.appendChild(document.createElement('div'));
                container.innerHTML = layout();
            }

            function start(params) {
                /* Need to create the GenomeAnnotation client object here because it requires params.
                 * The params is determined by the dataview route, which makes
                 * available:
                 *   workspaceId
                 *   objectId
                 *   objectVersion
                 *   ...
                 */
                var numFeatures = 0,
                    genomeAnnotation = GenomeAnnotation.client({
                    url: runtime.getConfig('services.genomeAnnotation_api.url'),
                    token: runtime.service('session').getAuthToken(),
                    ref: utils.getRef(params)
                });
                
                Array.from(container.querySelectorAll("[data-element]")).forEach(function (e) {
                    e.innerHTML = html.loading();
                });
                
                return genomeAnnotation.feature_type_counts()
                    .then(function (featureTypes) {
                        var ftCounts = {}, ftypes = [], fcounts = [];
                        for(var f in featureTypes) {
                            if (featureTypes.hasOwnProperty(f)) {
                                ftCounts[f] = numeral(featureTypes[f]).format('0,0');
                                ftypes.push(f);
                                fcounts.push(featureTypes[f]);
                                numFeatures += featureTypes[f];
                            }
                        }
                        
                        renderFeatureTypesPlot(ftypes,fcounts);
                                                
                        return genomeAnnotation.feature_ids({
                            filters: {
                                type_list: ftypes
                            }
                        })
                        .then(function (feature_ids) {
                            return genomeAnnotation.features(feature_ids.by_type[ftypes[0]].slice(0,10));
                        })
                        .then(function (feature_data) {
                            console.log(feature_data);
                            renderFeatureDataTable(feature_data);
                            return genomeAnnotation.taxon();
                        });
                    })
                    .then(function (taxon_ref) {
                        renderTaxonLink(taxon_ref);

                        var taxon = Taxon.client({
                            url: runtime.getConfig('services.taxon_api.url'),
                            token: runtime.service('session').getAuthToken(),
                            ref: taxon_ref
                        });

                        return taxon.taxonomic_id().then(function (taxId) {
                            renderTaxId(taxId);
                            return taxon.scientific_name();
                        })
                        .then(function (scientificName) {
                            renderScientificName(scientificName);
                            return taxon.kingdom();
                        })
                        .then(function (kingdom) {
                            renderKingdom(kingdom);
                            return taxon.genetic_code();
                        })
                        .then(function (geneticCode) {
                            renderGeneticCode(geneticCode);
                            return taxon.aliases()
                        })
                        .then(function (aliases) {
                            renderAliases(aliases);
                            return genomeAnnotation.assembly();
                        });
                    })
                    .then(function (assembly_ref) {
                        renderAssemblyLink(assembly_ref);
                        
                        var assembly = Assembly.client({
                            url: runtime.getConfig('services.assembly_api.url'),
                            token: runtime.service('session').getAuthToken(),
                            ref: assembly_ref
                        });
                        
                        return assembly.number_contigs().then(function (numContigs) {
                            renderNumberContigs(numContigs);
                            return assembly.dna_size();
                        })
                        .then(function (dnaSize) {
                            renderDNASize(dnaSize);
                            return assembly.gc_content()
                        })
                        .then(function (gc) {
                            renderGC(gc);
                        });
                    })
                    .catch(function (err) {
                       console.log(err); 
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