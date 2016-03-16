/*global define */
/*jslint white: true, browser: true */
define([
    'jquery',
    'datatables',
    'datatables_bootstrap',
    'kb/common/html',
    'kb/data/genomeAnnotation',
    'kb/data/taxon',
    'kb/data/assembly',
    '../utils',
    'numeral',
    'handlebars',
    'plotly'
],
    function ($,
              datatables,
              datatables_bootstrap,
              html,
              GenomeAnnotation,
              Taxon,
              Assembly,
              utils,
              numeral,
              handlebars,
              plotly) {
        'use strict';

        function factory(config) {
            var parent,
                container,
                genomeAnnotation,
                annotation_data = {},
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
                    filters: handlebars.compile("    <div class='col-md-12'>"
                                              + "        <button type='button' class='btn btn-default' id='filter_button'>"
                                              + "            <icon class='glyphicon glyphicon-option-vertical'/>"
                                              + "            <span>Filters</span>"
                                              + "        </button>"
                                              + "    </div>"
                                              + "    <div class='col-md-12 hidden' id='filter_panel'>"
                                              + "        <div class='panel panel-default'>"
                                              + "            <div class='panel-body filters_form'>"
                                              + "                <div class='col-md-3'>"
                                              + "                    <strong>Feature Types</strong>"
                                              + "                    <select multiple class='form-control' data-element='feature_types'>"
                                              + "                    {{#each featureTypes}}"
                                              + "                        <option value='{{this}}'>{{this}}</option>"
                                              + "                    {{/each}}"
                                              + "                    </select>"
                                              + "                </div>"
                                              + "                <div class='col-md-3'>"
                                              + "                    <strong>Feature Regions</strong>"
                                              + "                    <select multiple class='form-control' data-element='contig_ids'>"
                                              + "                    </select>"
                                              + "                </div>"                                                  
                                              + "                <div class='col-md-12'>"
                                              + "                    <strong>Feature Functions</strong>"
                                              + "                    <input type='text' class='form-control' placeholder='function keyword strings' data-element='function_strings'>"
                                              + "                </div>"
                                              + "                <div class='col-md-12'>"
                                              + "                    <strong>Feature Aliases</strong>"
                                              + "                    <input type='text' class='form-control' placeholder='alias strings' data-element='alias_strings'>"
                                              + "                </div>"
                                              + "                <div class='panel-footer'>"
                                              + "                    <button type='button' class='btn btn-primary pull-right' id='update_filters_button'>Update Results</button>"
                                              + "                </div>"
                                              + "            </div>"
                                              + "        </div>"
                                              + "    </div>"),
                    annotations: handlebars.compile("<div class='row'>"
                                                  + "    <div class='col-md-12' id='filters_div'></div>"
                                                  + "    <div class='col-md-12' data-element='feature_table_div'></div>"
                                                  + "</div>"),
                    features: handlebars.compile("<div class='col-md-6' id='feature_table_container'>"
                                                  + "        <h6>Limited to 1,000 results</h6>"
                                                  + "        <div id='no_results' class='hidden alert alert-danger' role='alert'>No results found using the current set of filters.</div>"
                                                  + "        <table class='col-md-4 table table-bordered table-striped' id='features_table'>"
                                                  + "            <thead>"
                                                  + "                <tr>"
                                                  + "                    <th>type</th>"
                                                  + "                    <th>contig</th>"
                                                  + "                    <th>id</th>"
                                                  + "                    <th>length</th>"
                                                  + "                    <th>function</th>"
                                                  + "                </tr>"
                                                  + "            </thead>"
                                                  + "            <tbody>"
                                                  + "                {{#each featureData}}"
                                                  + "                    <tr>"
                                                  + "                        <td>{{feature_type}}</td>"
                                                  + "                        <td>{{feature_locations.[0].contig_id}}</td>"
                                                  + "                        <td>{{feature_id}}</td>"
                                                  + "                        <td>{{feature_dna_sequence_length}}</td>"
                                                  + "                        <td>{{feature_function}}</td>"
                                                  + "                    </tr>"
                                                  + "                {{/each}}"
                                                  + "            </tbody>"
                                                  + "        </table>"
                                                  + "    </div>"
                                                  + "    <div class='col-md-6' data-element='feature_view'>"
                                                  + "        {{#each featureData}}"
                                                  + "        <div class='hidden' data-element='{{feature_id}}'>"
                                                  + "            <h4>Feature view</h4>"
                                                  + "            <div>"
                                                  + "                <strong>Locations</strong>"
                                                  + "                <table class='table'>"
                                                  + "                    <thead>"
                                                  + "                        <tr>"
                                                  + "                            <th><b>contig_id</b></th>"
                                                  + "                            <th><b>start</b></th>"
                                                  + "                            <th><b>strand</b></th>"
                                                  + "                            <th><b>length</b></th>"
                                                  + "                        </tr>"
                                                  + "                    </thead>"
                                                  + "                    <tbody>"
                                                  + "                    {{#each feature_locations}}"
                                                  + "                        <tr>"
                                                  + "                            <td>{{contig_id}}</td>"
                                                  + "                            <td>{{start}}</td>"
                                                  + "                            <td>{{strand}}</td>"
                                                  + "                            <td>{{length}}</td>"
                                                  + "                        </tr>"
                                                  + "                    {{/each}}"
                                                  + "                    </tbody>"
                                                  + "                </table>"
                                                  + "            </div>"
                                                  + "            <div>"
                                                  + "                <strong>DNA Sequence</strong>"
                                                  + "                <div class='well wordwrap'>{{feature_dna_sequence}}</div>"
                                                  + "            </div>"
                                                  + "            <div>"
                                                  + "                <div><strong>Aliases</strong></div>"
                                                  + "                <table class='table'>"
                                                  + "                    <thead>"
                                                  + "                        <tr>"
                                                  + "                            <th><b>Alias</b></th>"
                                                  + "                            <th><b>Sources</b></th>"
                                                  + "                        </tr>"
                                                  + "                    </thead>"
                                                  + "                    <tbody>"
                                                  + "                        {{#each feature_aliases}}"
                                                  + "                        <tr>"
                                                  + "                            <td>{{@key}}</td>"
                                                  + "                            <td>"
                                                  + "                                {{#each this}}"
                                                  + "                                <div>{{this}}</div>"
                                                  + "                                {{/each}}"
                                                  + "                            </td>"
                                                  + "                        </tr>"
                                                  + "                        {{else}}"
                                                  + "                        <tr>"
                                                  + "                            <td>No aliases present.</td>"
                                                  + "                            <td></td>"
                                                  + "                        </tr>"
                                                  + "                        {{/each}}"
                                                  + "                    </tbody>"
                                                  + "                </table>"
                                                  + "            </div>"
                                                  + "            <div>"
                                                  + "                <strong>Notes</strong>"
                                                  + "                <div class='well wordwrap'>{{feature_notes}}</div>"
                                                  + "            </div>"
                                                  + "        </div>"
                                                  + "    {{/each}}"                                                  
                                                  + "    </div>"
                                                  + "</div>"),
                    quality: handlebars.compile("<div class='row'>"
                                              + "</div>")
                };

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Genome Annotation Summary',
                        content: div({id: 'overview'}, panelTemplates.overview())
                    }),
                    html.makePanel({
                        title: 'Structural and Functional Annotations',
                        content: div({id: 'annotationInfo'}, panelTemplates.annotations())
                    })
                ]);
            }
            
            function renderFilterPanel(types) {
                container.querySelector("[id='filters_div']").innerHTML = panelTemplates.filters({
                    featureTypes: types
                });

                container.querySelector("[data-element='contig_ids']").innerHTML = handlebars.compile(
                    "{{#each contigIds}}"
                    + "<option value='{{this}}'>{{this}}</option>"
                    + "{{/each}}")({contigIds: annotation_data.contig_ids});
            }
                        
            function renderFeatureDataTable(data) {
                var formattedData = {}, i, len;
                                
                // format all numeric values
                for (var d in data) {
                    formattedData[d] = {};
                    for (var item in data[d]) {
                        if (String(item).indexOf('feature') != 0) {
                            continue;
                        }
                        
                        if (item === 'feature_dna_sequence_length') {
                            formattedData[d][item] = numeral(data[d][item]).format('0,0');
                        }
                        else if (item === 'feature_locations') {
                            formattedData[d].feature_locations = [];
                            for (i = 0, len = data[d].feature_locations.length; i < len; i+=1) {
                                formattedData[d].feature_locations.push({
                                    contig_id: data[d].feature_locations[i].contig_id,
                                    start: numeral(data[d].feature_locations[i].start).format('0,0'),
                                    strand: data[d].feature_locations[i].strand,
                                    length: numeral(data[d].feature_locations[i].length).format('0,0')
                                });
                            }
                        }
                        // TODO this is a hack for now, need to fix this in the API itself
                        else if (item == 'feature_notes') {
                            if (data[d].feature_notes === null) {
                                formattedData[d].feature_notes = '';
                            }
                            else {
                                formattedData[d].feature_notes = data[d].feature_notes.join('');
                            }
                        }
                        else {
                            formattedData[d][item] = data[d][item];
                        }
                    }
                }
                
                container.querySelector("[data-element='feature_table_div']").innerHTML = panelTemplates.features({
                    featureData: formattedData
                });
                
                if (data === null) {
                    $("#no_results").removeClass("hidden");
                }
                else {
                    $("#no_results").addClass("hidden");    
                }
                
                var table = $("#features_table").DataTable({lengthChange: false});

                /*
                 * Each row of the mini feature table should be clickable to pin a data preview.
                 * Mousing into a row if no row is pinned should highlight it and display the data preview.
                 * Mousing out of a row if no row is pinned should remove the highlight and remove the data
                 * preview for that row.
                 **/
                $("#features_table tbody").on('click', 'tr', function () {
                    var rowValues = table.row(this).data(),
                       pinnedElement = $(".pinned"),
                       rowDiv = $("div[data-element='" + rowValues[2] + "']");
                        
                    if (pinnedElement.length === 1 && pinnedElement[0] === rowDiv[0]) {
                        pinnedElement.removeClass('pinned').removeClass('show');
                        $(table.row(this).node()).removeClass('row_pinned');
                        return;
                    }
                    else if (pinnedElement.length == 1) {
                        $(".kb-feature-highlighted").removeClass('kb-feature-highlighted').removeClass('row_pinned');
                        pinnedElement.removeClass('pinned').removeClass('show').addClass('hidden');
                    }
                    
                    $("div[data-element='" + rowValues[2] + "']").removeClass('hidden')
                                                                 .addClass('show')
                                                                 .addClass('pinned');
                    $(table.row(this).node()).addClass('kb-feature-highlighted').addClass('row_pinned');
                }).on('mouseenter', 'tr', function () {
                    var rowValues = table.row(this).data(),
                        pinnedElement = $(".pinned");
                        
                    if (pinnedElement.length == 0) {
                        $("div[data-element='" + rowValues[2] + "']").removeClass('hidden')
                                                                     .addClass('show');    
                        $(table.row(this).node()).addClass('kb-feature-highlighted');
                    }
                    
                }).on('mouseleave', 'tr', function () {
                    var rowValues = table.row(this).data(),
                        pinnedElement = $(".pinned");
                    
                    if (pinnedElement.length == 0) {
                        $("div[data-element='" + rowValues[2] + "']").removeClass('show')
                                                                     .addClass('hidden');
                        $(".kb-feature-highlighted").removeClass('kb-feature-highlighted');
                    }
                });

                $("#filter_button").click(function () {
                    $("#filter_panel").toggleClass('hidden'); 
                });
                
                //setup the filter events
                $("#update_filters_button").click(function () {
                    var selected_types = $("[data-element='feature_types'] option:checked").toArray().map(function (e) {
                            return e.value;
                        }),
                        selected_contigs = $("[data-element='contig_ids'] option:checked").toArray().map(function (e) {
                            return e.value;
                        }),
                        selected_regions = [],
                        provided_functions = $("[data-element='function_strings']").val(),
                        provided_aliases = $("[data-element='alias_strings']").val(),
                        filters = {};
                                        
                    selected_contigs.forEach(function (cid) {                        
                        selected_regions.push(
                            {contig_id: cid, strand: '-', start: 1E9, length: 1E9},
                            {contig_id: cid, strand: '+', start: 0, length: 1E9}
                        );
                    });
                                        
                    container.querySelector("[data-element='feature_table_div']").innerHTML = html.loading();
                    
                    if (selected_types.length > 0) {
                        filters.type_list = selected_types;
                    }
                    
                    if (selected_regions.length > 0) {
                        filters.region_list = selected_regions;
                    }
                    
                    if (provided_functions.length > 0) {
                        if (provided_functions.indexOf(' ') > -1) {
                            filters.function_list = provided_functions.split(' ');
                        }
                        else {
                            filters.function_list = [provided_functions];
                        }
                    }
                    
                    if (provided_aliases.length > 0) {
                        if (provided_aliases.indexOf(' ') > -1) {
                            filters.alias_list = provided_aliases.split(' ');
                        }
                        else {
                            filters.alias_list = [provided_aliases];
                        }
                    }
                                                                               
                    genomeAnnotation.feature_ids(filters).then(function (feature_ids) {
                        var flattened_ids = [], subset;
                                                
                        for (var f in feature_ids.by_type) {
                            Array.prototype.push.apply(flattened_ids, feature_ids.by_type[f]);
                        }
                        
                        subset = flattened_ids.splice(0,1000);
                        
                        if (subset.length > 0) {
                            return genomeAnnotation.features(subset);
                        }
                        else {
                            return null;
                        }
                    }).then(function (feature_data) {
                        return renderFeatureDataTable(feature_data);
                    });
                });
            }
                                    
            function renderFeatureTypesPlot(ftypes, fcounts) {
                annotation_data.types = ftypes;
                
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
                
                container.querySelector("[id='featureTypesPlot']").innerHTML = "";
                plotly.newPlot("featureTypesPlot", data, plot_layout);
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
                var numFeatures = 0;
                
                genomeAnnotation = GenomeAnnotation.client({
                    url: runtime.getConfig('services.genomeAnnotation_api.url'),
                    token: runtime.service('session').getAuthToken(),
                    ref: utils.getRef(params),
                    timeout: 1000000000000
                });
                
                Array.from(container.querySelectorAll("[data-element]")).forEach(function (e) {
                    e.innerHTML = html.loading();
                });
                
                container.querySelector("[id='featureTypesPlot']").innerHTML = html.loading();
                
                return genomeAnnotation.taxon()
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
                            return assembly.gc_content();
                        })
                        .then(function (gc) {
                            renderGC(gc);
                            return assembly.contig_ids();
                        })
                        .then(function (ids) {
                            annotation_data.contig_ids = ids;
                            return genomeAnnotation.feature_type_counts();
                        });
                    })
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
                        renderFilterPanel(ftypes);
                                                
                        return genomeAnnotation.feature_ids({
                            filters: {
                                type_list: ftypes
                            }
                        })
                        .then(function (feature_ids) {
                            return genomeAnnotation.features(feature_ids.by_type[ftypes[0]].slice(0,1000));
                        })
                        .then(function (feature_data) {
                            renderFeatureDataTable(feature_data);
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