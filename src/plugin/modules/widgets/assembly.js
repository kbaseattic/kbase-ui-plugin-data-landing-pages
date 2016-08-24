/*global define */
/*jslint white: true, browser: true */
define([
    'kb/common/html',
    'kb_sdk_clients/GenomeAnnotationAPI/dev/GenomeAnnotationAPIClient',
    'kb_sdk_clients/TaxonAPI/dev/TaxonAPIClient',
    'kb_sdk_clients/AssemblyAPI/dev/AssemblyAPIClient',
    '../utils',
    'numeral',
    'handlebars',
    'plotly'
],

    function (html, GenomeAnnotation, Taxon, Assembly, utils, numeral, handlebars, plotly) {
        'use strict';

        function factory(config) {
            var parent, container, runtime = config.runtime,
                div = html.tag('div'),
                templates = {
                    overview: "<div class='row'>"
                        + "    <div class='col-md-6'>"
                        + "        <table class='table'>"
                        + "            <tbody>"
                        + "                <tr><td><b>Number of Contigs</b></td><td data-element='numContigs'></td></tr>"
                        + "                <tr><td><b>Total DNA Size</b></td><td data-element='dnaSize'></td></tr>"
                        + "                <tr><td><b>GC %</b></td><td data-element='gcPercent'></td></tr>"
                        + "            </tbody>"
                        + "        </table>"
                        + "    </div>"
                        + "    <div class='col-md-6'>"
                        + "        <table class='table'>"
                        + "            <tbody>"
                        + "                <tr><td><b>External Source</b></td><td data-element='externalSource'></td></tr>"
                        + "                <tr><td><b>External Source ID</b></td><td data-element='externalId'></td></tr>"
                        + "                <tr><td><b>External Source Origination Date</b></td><td data-element='externalDate'></td></tr>"                        
                        + "            </tbody>"
                        + "        </table>"
                        + "    </div>"
                        + "</div>",
                    quality: "<div class='row'>"
                           + "    <div class='col-md-5 col-md-offset-1'>"
                           + "        <div data-element='contig_gc_hist'></div>"
                           + "    </div>"
                           + "    <div class='col-md-5'>"
                           + "        <div data-element='contig_lengths_hist'></div>"
                           + "    </div>"
                           + "</div>"
                           + "<div class='row'>"
                           + "    <div class='col-md-5 col-md-offset-1'>"
                           + "        <div data-element='contig_gc_vs_length'></div>"
                           + "    </div>"
                           + "    <div class='col-md-5'>"
                           + "        <div data-element='nx_plot'></div>"
                           + "    </div>"
                           + "</div>",
                    annotations: "<div class='row'>"
                               + "    <div data-element='linked_annotations'></div>"
                               + "</div>",
                    taxons: "<div class='row'>"
                          + "    <div data-element='linked_taxons'></div>"
                          + "</div>"
                };

                
            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Assembly Summary',
                        content: div({id: 'overview'}, html.loading())
                    }),
                    html.makePanel({
                        title: 'Assembly Statistics',
                        content: div({id: 'quality'}, html.loading())
                    })                    
                ]);
            }

            function intcmp(a, b) { return (a < b) ? -1 : ((a > b) ? 1 : 0); }

            function renderPlots(contig_ids, gc, lengths, nxlen) {
                // Common settings
                var marker_color = '#1C77B5',
                    nx_keys = _.map(_.keys(nxlen), function(key) { return key * 1; }),
                    length_pairs = _.pairs(lengths)
                // sort Nx keys
                nx_keys.sort(intcmp);
                // Sort length_pairs by second element (the length)
                length_pairs.sort(function(p1, p2) { return intcmp(p1[1], p2[1]); });
                // All the plots in a list
                var plots= [
                    {
                        div: container.querySelector("div[data-element='contig_lengths_hist']"),
                        layout: {
                            title: '<b>Contig Length Distribution</b>',
                            fontsize: 24,
                            xaxis: { title: '<b>Length (bp)</b>' },
                            yaxis: { title: '<b>Count</b>' }
                        },
                        data: [{
                            x: Object.keys(lengths).map(function (id) { return lengths[id]; }),
                            type: 'histogram',
                            marker: { line: {width: 1, color: 'rgb(255,255,255)'} }
                        }]
                    },
                    {
                        div: container.querySelector("div[data-element='contig_gc_hist']"),
                        layout: {
                            title: '<b>Contig GC% Distribution</b>',
                            fontsize: 24,
                            xaxis: { title: '<b>GC%</b>' },
                            yaxis: { title: '<b>Count</b>' }
                        },
                        data: [{
                            x: _.map(_.values(gc), function(g){ return g * 100.0 }),
                            text: _.keys(gc),
                            hoverinfo: 'x+text',
                            type: 'histogram',
                            marker: {
                                line: {width: 1, color: 'rgb(255,255,255)'},
                                color: marker_color
                            }
                        }]
                    },
                    //{
                    //    div: container.querySelector("div[data-element='contig_lengths_scatter']"),
                    //    layout: {
                    //        title: '<b>Contig Length</b>',
                    //        fontsize: 24,
                    //        xaxis: {title: '<b>Contig Index</b>'},
                    //        yaxis: {title: '<b>Length (bp)</b>'}
                    //    },
                    //    data: [{
                    //        y: contig_ids.map(function (id) { return lengths[id]; }),
                    //        x: contig_ids.map(function (id) { return contig_ids.indexOf(id); }),
                    //        type: 'scatter',
                    //        mode: 'lines',
                    //        marker: { color: marker_color },
                    //        hoverinfo: 'x+y'
                    //    }]
                    //},
                    /*
                    {
                        div: container.querySelector("div[data-element='contig_gc_percent_scatter']"),
                        data: [{
                            x: length_pairs.map(function (p) { return p[1]; }),
                            y: length_pairs.map(function (p) { return gc[p[0]] * 100.0; }),
                            mode: 'markers',
                            type: 'scatter',
                            marker: { color: marker_color },
                            hoverinfo: 'x+y'
                        }],
                        layout: {
                            title: '<b>Contig GC%</b>',
                            fontsize: 24,
                            xaxis: {
                                title: '<b>Contig Length (bp)</b>'
                            },
                            yaxis: {
                                zeroline: true,
                                title: '<b>Contig GC %</b>'
                            }
                        }
                    },
                    */
                    {
                        div: container.querySelector("div[data-element='contig_gc_vs_length']"),
                        layout: {
                            title: '<b>GC by Contig Length</b>',
                            fontsize: 24,
                            xaxis: {title: '<b>Contig GC%</b>'},
                            yaxis: {title: '<b>Contig length (bp)</b>'}
                        },
                        data: [{
                            type: 'scatter',
                            mode: 'markers',
                            x: contig_ids.map(function (id) {
                                return gc[id] * 100.0;
                            }),
                            y: contig_ids.map(function (id) {
                                return lengths[id];
                            }),
                            text: contig_ids,
                            hoverinfo: 'all',
                            marker: { color: marker_color }
                        }]
                    },
                    {
                        div: container.querySelector("div[data-element='nx_plot']"),
                        layout: {
                            title: '<b>N(x) Length</b>',
                            fontsize: 24,
                            xaxis: {
                                title: '<b>Nx percentage</b>',
                                tickmode: 'array',
                                tickvals: _.range(0, 110, 10),
//                                ticktext: _.map(_.range(0, 110, 10), function(x){ return '' + x }),
                                showgrid: true
                            },
                            yaxis: {title: '<b>Contig Length (bp)</b>'}
                        },
                        data: [{
                                type: 'scatter',
                                mode: 'lines',
                                x: nx_keys,
                                y: nx_keys.map(function(key){ return nxlen[key]; }),
                                marker: { color: marker_color },
                                showlegend: false,
                                hoverinfo: 'x+y'
                            },
                            {
                                type: 'scatter',
                                mode: 'lines',
                                x: [50, 50],
                                y: [0, _.max(_.values(nxlen), intcmp)],
                                line: { dash: 5, color: 'red' },
                                showlegend: false
                            }
                        ],
                    }
                ];

                _.each(plots, function(o) {
                    o.div.innerHTML = "";
                    plotly.newPlot(o.div, o.data, o.layout);
                });
            }
            
            function renderNumContigs(numContigs) {
                container.querySelector('td[data-element="numContigs"]').innerHTML = numeral(numContigs).format('0,0');
            }

            function renderDNASize(dnaSize) {
                container.querySelector('td[data-element="dnaSize"]').innerHTML = numeral(dnaSize).format('0,0');
            }

            function renderGC(gc) {
                container.querySelector('td[data-element="gcPercent"]').innerHTML = numeral(gc).format('0.00%');
            }
            
            function renderExternalSourceInfo(external_source_info) {
                container.querySelector('td[data-element="externalSource"]').innerHTML = external_source_info.external_source;
                container.querySelector('td[data-element="externalId"]').innerHTML = external_source_info.external_source_id;
                container.querySelector('td[data-element="externalDate"]').innerHTML = external_source_info.external_source_origination_date;
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
                
                container.querySelector('div[id="overview"]').innerHTML = templates.overview;
                container.querySelector('div[id="quality"]').innerHTML = templates.quality;
 
                Array.from(container.querySelectorAll("[data-element]")).forEach(function (e) {
                    e.innerHTML = html.loading();
                });
                
                var assemblyRef = utils.getRef(params);

                var assemblyClient = new Assembly({
                                        url: runtime.getConfig('services.service_wizard.url'),
                                        auth: {'token':runtime.service('session').getAuthToken()},
                                        version: 'dev'
                                    });

                var contig_ids;
                var contig_lengths;
                var contigs_gc;

                return assemblyClient.get_number_contigs(assemblyRef)
                    .then(function (numContigs) {
                        renderNumContigs(numContigs);
                        return assemblyClient.get_dna_size(assemblyRef);
                    })
                    .then(function (dnaSize) {
                        renderDNASize(dnaSize);
                        return assemblyClient.get_gc_content(assemblyRef);
                    })
                    .then(function (gc) {
                        renderGC(gc);
                        return assemblyClient.get_external_source_info(assemblyRef);
                    })
                    .then(function(external_source_info) {
                        renderExternalSourceInfo(external_source_info);
                        return assemblyClient.get_contig_ids(assemblyRef);
                    })
                    .then(function (ids) {
                        contig_ids = ids;
                        return assemblyClient.get_contig_lengths(assemblyRef);
                    })
                    .then(function (lengths) {
                        contig_lengths = lengths;
                        return assemblyClient.get_contig_gc_content(assemblyRef);
                    })
                    .then(function (gc) {
                        contigs_gc = gc;
                        var contig_length_values = _.values(contig_lengths);
                        var nx_values = utils.nx(contig_length_values, _.range(1,101,1));
                        renderPlots(contig_ids, contigs_gc, contig_lengths, nx_values);
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
