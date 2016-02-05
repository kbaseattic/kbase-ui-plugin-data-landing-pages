/*global define */
/*jslint white: true, browser: true */
define([
    'kb/common/html',
    'kb/data/assembly',
    '../utils',
    'numeral',
    'handlebars',
    'plotly'
],
    function (html, Assembly, utils, numeral, handlebars, plotly) {
        'use strict';

        function factory(config) {
            var parent, container, runtime = config.runtime,
                t = html.tag, ol = t('ol'),
                li = t('li'),
                a = t('a'),
                div = t('div'),
                pre = t('pre'),
                table = t('table'),
                tr = t('tr'),
                td = t('td'),
                templates = {
                    overview: handlebars.compile(String()
                        + "<div class='row'>"
                        + "    <div class='col-md-4'>"
                        + "        <table class='table table-bordered'>"
                        + "            <tr><td><b>Number of Contigs</b></td><td data-element='numContigs'></td></tr>"
                        + "            <tr><td><b>Total DNA Size</b></td><td data-element='dnaSize'></td></tr>"
                        + "            <tr><td><b>GC %25</b></td><td data-element='gcPercent'></td></tr>"
                        + "        </table>"
                        + "    </div>"
                        + "    <div class='col-md-8'>"
                        + "        <div data-element='contig_lengths_plot'></div>"
                        + "        <div data-element='contig_gc_percent_plot'></div>"
                        + "        <div data-element='contig_gc_length_plot'></div>"
                        + "    </div>"
                        + "</div>")
                };

            // VIEW

            function layout() {
                return div([
                    html.makePanel({
                        title: 'Overview',
                        dataElement: "overview"
                    }, html.loading()),
                    html.makePanel({
                        title: 'Data Quality',
                        content: div([
                            div({dataElement: 'plot1'}, "Plot1"),
                            div({dataElement: 'plot2'}, "Plot2")
                        ])
                    }, html.loading())
                ]);
            }

            function renderPlotContigLengths(lengths) {                
                var keys = Object.keys(lengths),
                    vals = [],
                    i = 0,
                    len = keys.length,
                    data,
                    data_div = container.querySelector('[data-element="contig-lengths-plot"]');
                
                keys.sort(function (a,b) {
                    if (String(a).split('.')[-1] < String(b).split('.')[-1]) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                });
                
                for (i = 0; i < len; i+=1) {
                    vals.push(lengths[keys[i]]);
                }
                
                data = {
                    x: keys,
                    y: vals,
                    type: 'bar'
                };
                                
                plotly.newPlot(data_div, data);
            }
            
            function renderNumContigs(numContigs) {
                container.querySelector('[data-element="numContigs"]').innerHTML = numeral(numContigs).format('0,0');
            }

            function renderDNASize(dnaSize) {
                container.querySelector('[data-element="dnaSize"]').innerHTML = numeral(dnaSize).format('0,0');
            }

            function renderGC(gc) {
                container.querySelector('[data-element="gcPercent"]').innerHTML = numeral(gc).format('0.00%');
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
                
                console.log(templates.overview());
                container.querySelector('[data-element="overview"]').innerHTML = templates.overview();
                
                var assembly = Assembly.client({
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
                        return assembly.contig_lengths();
                    })
                    .then(function (lengths) {
                        //renderPlotContigLengths(lengths);
                        return assembly.contig_gc_content();
                    });
                    /*
                    .then(function (contigs_gc) {
                        //renderPlotContigGC(contigs_gc);
                    });*/
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