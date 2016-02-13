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
                    quality: handlebars.compile([
                        "<div class='row'>",
                        "  <div class='col-md-5 col-md-offset-1'>",
                        "    <div id='annotationDensityScatter'></div>",
                        "  </div>",
                        "  <div class='col-md-5'>",
                        "    <div id='annotationDensityDist'></div>",
                        "  </div>",
                        "</div>"].join('\n')),
                    annotations: handlebars.compile("<div class='row'>"
                                              + "Plots</div>")
                };

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Overview',
                        content: div({dataElement: 'overview'}, html.loading())
                    }),
                    html.makePanel({
                        title: 'Structural and Functional Annotations',
                        content: div({dataElement: 'annotationInfo'}, html.loading())
                    }),
                    html.makePanel({
                        title: 'Genome Annotation Quality',
                        content: div({dataElement: 'qualityInfo'}, "")
                    })
                ]);
            }

            function renderFeatureTypeCounts(featureTypeCounts) {
                container.querySelector('[data-element="overview"]').innerHTML = panelTemplates.overview({
                   featuretype: featureTypeCounts                                                               
                });
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

            function renderAnnotationDensityPlots(scatter_id, hist_id, cids, densities, lengths) {
                var data, layout;
                var x_values = cids.map(function(k) {return lengths[k];}),
                    y_values = cids.map(function(k) {return 1000. * densities[k];});

                //console.debug("plot ids,x,y:", cids, x_values, y_values);

                // Scatterplot
                data = [{
                    type: 'scatter',
                    mode: 'markers',
                    x: x_values,
                    y: y_values,
                    text: cids,
                    hoverinfo: 'all'
                }];
                layout =  {
                    title: '<b>Annotation Density vs. Contig Length</b>',
                    fontsize: 24,
                    xaxis: {title: 'Contig Length'},
                    yaxis: {
                        title: 'Annotation Density<br>(num. annotations per 1000bp)<br>&nbsp;',
                        rangemode: 'tozero',
                        zeroline: false
                    },
                    aspectratio: {x: 4, y: 3}
                };
                plotly.newPlot(scatter_id, data, layout);

                // Histogram
                data = [{
                    type: 'histogram',
                    x: y_values
                }];
                layout =  {
                    title: '<b>Annotation Density Distribution</b>',
                    fontsize: 24,
                    yaxis: {title: 'Count'},
                    xaxis: {
                        title: 'Annotation Density<br>(num. annotations per 1000bp)',
                    },
                    aspectratio: {x: 4, y: 3}
                };
                plotly.newPlot(hist_id, data, layout);
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

            function renderQualityInfo(genomeAnnotation) {
                var assembly = null,
                    contig_densities = {},
                    contig_lengths = {},
                    contig_ids = [];

                container.querySelector('[data-element="qualityInfo"]').innerHTML =
                    panelTemplates.quality();

                // Get associated assembly, store in outer scope
                genomeAnnotation.assembly()
                    .then(function(asm_ref) {
                        assembly = Assembly.client({
                            url: runtime.getConfig('services.assembly_api.url'),
                            token: runtime.service('session').getAuthToken(),
                            ref: asm_ref
                        });
                        var filter = {}; // {'type_list': ['CDS']}
                        return genomeAnnotation.feature_ids(filter, 'region');
                    })
                    // Get counts of features in each contig
                    .then(function(fids) {
                        var counts = {},
                            regions = fids.by_region;
                        var first = true;
                        // Keys of the regions are contig identifiers, so
                        // loop through each of these and add up ranges on each strand.
                        _.each(_.keys(regions), function(contig_id) {
                            if (first) {
                                console.debug('region:', regions[contig_id]);
                                first = false;
                            }
                            var num_features = _.keys(regions[contig_id]['+']).length +
                                _.keys(regions[contig_id]['-'].length);
                            //console.debug('feature contig_id=' + contig_id + " num_features=" + num_features);
                            counts[contig_id] = num_features;
                        });
                        contig_ids = _.keys(regions);
                        contig_ids.sort();
                        return counts;
                    })
                    // Calculate densities for each contig
                    // a. put counts in densities, get lengths for all contigs
                    .then(function(counts) {
                        contig_densities = counts;
                        return assembly.contig_lengths(contig_ids);
                    })
                    // b. divide counts by length of each contig
                    .then(function(lengths) {
                        contig_lengths = lengths;
                        //console.debug('contig lengths:', lengths);
                        _.each(contig_ids, function(key) {
                            var val = lengths[key];
                            if (val == 0) {
                                console.warn('Zero-length contig id=' + key);
                                contig_densities[key] = 0;
                            }
                            else {
                                contig_densities[key] /= 1. * val;
                            }
                        });
                        //console.debug('contig densities:', contig_densities);
                        return null;
                    })
                    .then(function() {
                        renderAnnotationDensityPlots('annotationDensityScatter', 'annotationDensityDist',
                            contig_ids, contig_densities, contig_lengths);
                    })
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
                var genomeAnnotation = GenomeAnnotation.client({
                    url: runtime.getConfig('services.genomeAnnotation_api.url'),
                    token: runtime.service('session').getAuthToken(),
                    ref: utils.getRef(params)
                });
                
                return genomeAnnotation.feature_type_counts()
                    .then(function (featureTypes) {
                        console.debug("Plot feature type counts");
                        var ftCounts = {}, ftypes = [], fcounts = [];
                        for(var f in featureTypes) {
                            if (featureTypes.hasOwnProperty(f)) {
                                ftCounts[f] = numeral(featureTypes[f]).format('0,0');
                                ftypes.push(f);
                                fcounts.push(featureTypes[f]);
                            }
                        }
                        
                        renderFeatureTypeCounts(ftCounts);
                        renderFeatureTypesPlot(ftypes,fcounts);
                        return genomeAnnotation.taxon();
                    })
                    .then(function (taxon_ref) {
                        renderTaxonLink(taxon_ref);

                        var taxon = Taxon.client({
                            url: runtime.getConfig('services.taxon_api.url'),
                            token: runtime.service('session').getAuthToken(),
                            ref: taxon_ref
                        });

                        taxon.taxonomic_id().then(function (taxId) {
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
                        });
                        
                        return genomeAnnotation.assembly();
                    })
                    .then(function (assembly_ref) {
                        renderAssemblyLink(assembly_ref);
                        
                        var assembly = Assembly.client({
                            url: runtime.getConfig('services.assembly_api.url'),
                            token: runtime.service('session').getAuthToken(),
                            ref: assembly_ref
                        });
                        
                        assembly.number_contigs().then(function (numContigs) {
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
                        return null;
                    })
                    .then(function() {
                        console.debug("Rendering genome quality plots");
                        renderQualityInfo(genomeAnnotation);
                        return null;
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