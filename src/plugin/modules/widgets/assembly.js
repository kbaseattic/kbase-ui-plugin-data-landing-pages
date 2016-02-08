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
            var parent, container, runtime = config.runtime,
                div = html.tag('div'),
                templates = {
                    overview: "<div class='row'>"
                        + "    <div class='col-md-6'>"
                        + "        <table class='table table-bordered'>"
                        + "            <tbody>"
                        + "                <tr><td><b>Number of Contigs</b></td><td data-element='numContigs'></td></tr>"
                        + "                <tr><td><b>Total DNA Size</b></td><td data-element='dnaSize'></td></tr>"
                        + "                <tr><td><b>GC %</b></td><td data-element='gcPercent'></td></tr>"
                        + "                <tr><td><b>External Source</b></td><td data-element='externalSource'></td></tr>"
                        + "                <tr><td><b>External Source ID</b></td><td data-element='externalId'></td></tr>"
                        + "                <tr><td><b>External Source Origination Date</b></td><td data-element='externalDate'></td></tr>"                        
                        + "            </tbody>"
                        + "        </table>"
                        + "    </div>"
                        + "</div>"
                        + "<div class='row'>"
                        + "    <div class='col-md-6'>"
                        + "        <div data-element='contig_gc_percent_scatter'></div>"
                        + "    </div>"
                        + "    <div class='col-md-6'>"
                        + "        <div data-element='contig_lengths_scatter'></div>"
                        + "    </div>"
                        + "</div>"
                        + "<div class='row'>"
                        + "</div>",
                    quality: "<div class='row'>"
                           + "    <div class='col-md-6'>"
                           + "        <div data-element='nx_plot'></div>"
                           + "        <div data-element='contig_lengths_hist'></div>"
                           + "        <div data-element='contig_gc_vs_length'></div>"
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
                        content: div({dataElement: 'overview'}, html.loading())
                    }),
                    html.makePanel({
                        title: 'Assembly Quality',
                        content: div({dataElement: 'quality'}, html.loading())
                    })                    
                ]);
            }

            function renderPlotContigLengths(contig_ids, lengths) {
                var plot1 = {
                        div: container.querySelector("div[data-element='contig_lengths_hist']"),
                        layout: {
                            title: '<b>Contig Length Distribution</b>',
                            fontsize: 24,
                            xaxis: { title: '<b>Length (bp)</b>' },
                            yaxis: { title: '<b>Binned Contigs</b>' }
                        },
                        data: [{
                            x: Object.keys(lengths).map(function (id) { return lengths[id]; }),
                            type: 'histogram',
                            marker: { color: 'rgb(28,110,38)' }                    
                        }]
                    },
                    plot2 = {
                        div: container.querySelector("div[data-element='contig_lengths_scatter']"),
                        layout: {
                            title: '<b>Contig Length</b>',
                            fontsize: 24,
                            xaxis: {title: '<b>Contig Index</b>'},
                            yaxis: {title: '<b>Length (bp)</b>'}
                        },
                        data: [{
                            y: contig_ids.map(function (id) { return lengths[id]; }),
                            x: contig_ids.map(function (id) { return contig_ids.indexOf(id); }),
                            type: 'scatter',
                            mode: 'lines',
                            marker: { color: 'rgb(45,86,104)' }
                        }]
                    };
                
                plotly.newPlot(plot1.div, plot1.data, plot1.layout);
                plotly.newPlot(plot2.div, plot2.data, plot2.layout);
            }

            
            function renderPlotContigGC(contig_ids, gc) {                
                var plot1 = {
                    data: [{
                        x: contig_ids.map(function (id) { return contig_ids.indexOf(id); }),
                        y: contig_ids.map(function (id) { return gc[id] * 100.0; }),
                        mode: 'lines',
                        type: 'scatter',
                        marker: {
                            color: 'rgb(28,110,38)'
                        }                    
                    }],
                    layout: {
                        title: '<b>Contig GC Percentage</b>',
                        fontsize: 24,
                        xaxis: {
                            title: '<b>Contig Index</b>'
                        },
                        yaxis: {
                            zeroline: true,
                            title: '<b>GC %</b>'
                        }
                    },
                    div: container.querySelector("div[data-element='contig_gc_percent_scatter']")
                };
                
                plotly.newPlot(plot1.div, plot1.data, plot1.layout);
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
                
                container.querySelector('div[data-element="overview"]').innerHTML = templates.overview;
                container.querySelector('div[data-element="quality"]').innerHTML = templates.quality;
                                
                var contig_ids,
                    assembly = Assembly.client({
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
                        return assembly.external_source_info();
                    })
                    .then(function(external_source_info) {
                        renderExternalSourceInfo(external_source_info);
                        return assembly.contig_ids();
                    })
                    .then(function (ids) {
                        contig_ids = ids;
                        return assembly.contig_lengths();
                    })
                    .then(function (lengths) {
                        renderPlotContigLengths(contig_ids, lengths);
                        return assembly.contig_gc_content();
                    })
                    .then(function (contigs_gc) {
                        renderPlotContigGC(contig_ids, contigs_gc);
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