define([
    'jquery',
    'bluebird',
    'underscore',
    'kb_common/html',
    'kb_common/jsonRpc/dynamicServiceClient',
    '../utils',
    '../widgets/kbaseGenomeAnnotationAssembly',
    'plotly'
], function(
    $,
    Promise,
    US,
    html,
    DynamicServiceClient,
    utils,
    kbaseGenomeAnnotationAssembly,
    plotly
) {
    'use strict';

    function factory(config) {
        var parent, container,
            runtime = config.runtime,
            div = html.tag('div'),
            templates = {
                overview: '<div class=\'row\'>' +
                    '    <div class=\'col-md-12 overview-content\'>' +
                    '    </div>' +
                    '</div>',
                quality: '<div class=\'row\'>' +
                    '    <div class=\'col-md-5 col-md-offset-1\'>' +
                    '        <div data-element=\'contig_gc_hist\'></div>' +
                    '    </div>' +
                    '    <div class=\'col-md-5\'>' +
                    '        <div data-element=\'contig_lengths_hist\'></div>' +
                    '    </div>' +
                    '</div>' +
                    '<div class=\'row\'>' +
                    '    <div class=\'col-md-5 col-md-offset-1\'>' +
                    '        <div data-element=\'contig_gc_vs_length\'></div>' +
                    '    </div>' +
                    '    <div class=\'col-md-5\'>' +
                    '        <div data-element=\'nx_plot\'></div>' +
                    '    </div>' +
                    '</div>',
                annotations: '<div class=\'row\'>' +
                    '    <div data-element=\'linked_annotations\'></div>' +
                    '</div>',
                taxons: '<div class=\'row\'>' +
                    '    <div data-element=\'linked_taxons\'></div>' +
                    '</div>'
            };

        // VIEW

        function layout() {
            return div([
                html.makePanel({
                    title: 'Assembly Summary',
                    content: div({ id: 'overview' }, html.loading())
                }),
                html.makePanel({
                    title: 'Assembly Statistics',
                    content: div({ id: 'quality' }, html.loading())
                })
            ]);
        }

        function intcmp(a, b) { return (a < b) ? -1 : ((a > b) ? 1 : 0); }

        function renderPlots(contig_ids, gc, lengths, nxlen) {
            // Common settings
            var marker_color = '#1C77B5',
                nx_keys = Object.keys(nxlen).map(function(key) { return key * 1; }),
                length_pairs = Object.keys(lengths).map(function(key) {
                    return [key, lengths[key]];
                });
            // sort Nx keys
            nx_keys.sort(intcmp);
            // Sort length_pairs by second element (the length)
            length_pairs.sort(function(p1, p2) { return intcmp(p1[1], p2[1]); });
            // All the plots in a list
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
            var plots = [{
                div: container.querySelector('div[data-element=\'contig_lengths_hist\']'),
                layout: {
                    title: '<b>Contig Length Distribution</b>',
                    fontsize: 24,
                    xaxis: { title: '<b>Length (bp)</b>' },
                    yaxis: { title: '<b>Count</b>' }
                },
                data: [{
                    x: Object.keys(lengths).map(function(id) { return lengths[id]; }),
                    type: 'histogram',
                    marker: { line: { width: 1, color: 'rgb(255,255,255)' } }
                }]
            }, {
                div: container.querySelector('div[data-element=\'contig_gc_hist\']'),
                layout: {
                    title: '<b>Contig GC% Distribution</b>',
                    fontsize: 24,
                    xaxis: { title: '<b>GC%</b>' },
                    yaxis: { title: '<b>Count</b>' }
                },
                data: [{
                    x: Object.keys(gc).map(function(key) {
                        return gc[key] * 100.0;
                    }),
                    text: Object.keys(gc),
                    hoverinfo: 'x+text',
                    type: 'histogram',
                    marker: {
                        line: { width: 1, color: 'rgb(255,255,255)' },
                        color: marker_color
                    }
                }]
            }, {
                div: container.querySelector('div[data-element=\'contig_gc_vs_length\']'),
                layout: {
                    title: '<b>GC by Contig Length</b>',
                    fontsize: 24,
                    xaxis: { title: '<b>Contig GC%</b>' },
                    yaxis: { title: '<b>Contig length (bp)</b>' }
                },
                data: [{
                    type: 'scatter',
                    mode: 'markers',
                    x: contig_ids.map(function(id) {
                        return gc[id] * 100.0;
                    }),
                    y: contig_ids.map(function(id) {
                        return lengths[id];
                    }),
                    text: contig_ids,
                    hoverinfo: 'all',
                    marker: { color: marker_color }
                }]
            }, {
                div: container.querySelector('div[data-element=\'nx_plot\']'),
                layout: {
                    title: '<b>N(x) Length</b>',
                    fontsize: 24,
                    xaxis: {
                        title: '<b>Nx percentage</b>',
                        tickmode: 'array',
                        tickvals: US.range(0, 110, 10),
                        //                                ticktext: US.map(US.range(0, 110, 10), function(x){ return '' + x }),
                        showgrid: true
                    },
                    yaxis: { title: '<b>Contig Length (bp)</b>' }
                },
                data: [{
                    type: 'scatter',
                    mode: 'lines',
                    x: nx_keys,
                    y: nx_keys.map(function(key) { return nxlen[key]; }),
                    marker: { color: marker_color },
                    showlegend: false,
                    hoverinfo: 'x+y'
                }, {
                    type: 'scatter',
                    mode: 'lines',
                    x: [50, 50],
                    y: [0, US.max(US.values(nxlen), intcmp)],
                    line: { dash: 5, color: 'red' },
                    showlegend: false
                }],
            }];

            plots.forEach(function(o) {
                o.div.innerHTML = '';
                plotly.newPlot(o.div, o.data, o.layout);
            });
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

            Array.from(container.querySelectorAll('[data-element]')).forEach(function(e) {
                e.innerHTML = html.loading();
            });

            // get the assembly reference
            var assemblyRef = utils.getRef(params);

            // use the modified assembly widget from the narrative
            var $overviewDiv = $(container).find('.overview-content');
            var $assemblySummaryWidgetDiv = $('<div>');
            $assemblySummaryWidgetDiv.kbaseGenomeAnnotationAssembly({
                runtime: runtime,
                ref: assemblyRef
            });
            $overviewDiv.append($assemblySummaryWidgetDiv);

            // Show the stats plots
            var assemblyClient = new DynamicServiceClient({
                url: runtime.config('services.service_wizard.url'),
                token: runtime.service('session').getAuthToken(),
                module: 'AssemblyAPI'
            });

            var contig_ids;
            var contig_lengths;
            var contigs_gc;

            var plotDataCalls = [];
            plotDataCalls.push(
                assemblyClient.callFunc('get_contig_ids', [assemblyRef])
                .spread(function(ids) {
                    contig_ids = ids;
                })
            );
            plotDataCalls.push(
                assemblyClient.callFunc('get_contig_lengths', [assemblyRef, null])
                .spread(function(lengths) {
                    contig_lengths = lengths;
                })
            );
            plotDataCalls.push(
                assemblyClient.callFunc('get_contig_gc_content', [assemblyRef, null])
                .spread(function(gc) {
                    contigs_gc = gc;
                })
            );

            // Get all the data at the same time
            return Promise.all(plotDataCalls)
                .then(function() {
                    var contig_length_values = US.values(contig_lengths);
                    var nx_values = utils.nx(contig_length_values, US.range(1, 101, 1));
                    renderPlots(contig_ids, contigs_gc, contig_lengths, nx_values);
                })
                .catch(function(err) {
                    console.error(err);
                });
        }

        function stop() {
            // nothing to do
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
        make: function(config) {
            return factory(config);
        }
    };
});