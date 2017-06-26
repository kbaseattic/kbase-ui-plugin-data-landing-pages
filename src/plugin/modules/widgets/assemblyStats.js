define([
    'bluebird',
    'underscore',
    '../queryService',
    'kb_common/html',
    'kb_common/bootstrapUtils',
    '../utils',
    './plots/assemblyContigLengthDistribution',
    './plots/assemblyGCDistribution',
    './plots/assemblyNxPercentage',
    './plots/assemblyGCLengthVsPercentage',
    './plots/assemblyGCPercentageScatter',
    './plots/assemblyContigLengthsScatter',

    'datatables_bootstrap'
], function (
    Promise,
    US,
    QueryService,
    html,
    BS,
    utils,
    AssemblyContigLengthDistribution,
    AssemblyGCDistribution,
    AssemblyNxPercentage,
    AssemblyGCLengthVsPercentage,
    AssemblyGCPercentageScatter,
    AssemblyContigLengthsScatter
) {
    'use strict';

    var t = html.tag,
        div = t('div');

    function factory(config) {
        var runtime = config.runtime;
        var hostNode, container;
        var objectRef;
        var queryService = QueryService({
            runtime: runtime
        });

        var markerColor = '#1C77B5';

        function plotCellLayout(id) {
            return div({
                class: 'col-md-5 col-md-offset-1',
                style: {
                    border: '2px silver solid',
                    borderRadius: '10px',
                    padding: '4px',
                    marginBottom: '10px'
                }
            }, div({
                dataElement: id
            }, div({
                style: {
                    textAlign: 'center'
                }
            }, html.loading())));
        }

        function layout() {
            return div({
                class: 'container-fluid'
            }, [
                div({
                    dataElement: 'error'
                }),
                div({
                    class: 'row'
                }, [
                    plotCellLayout('contig-gc-hist'),
                    plotCellLayout('contig-lengths-hist')
                ]),
                div({
                    class: 'row'
                }, [
                    plotCellLayout('contig-gc-vs-length'),
                    plotCellLayout('nx-plot')
                ]),
                div({
                    class: 'row'
                }, [
                    plotCellLayout('contig-gc-percent-scatter'),
                    plotCellLayout('contig-lengths-scatter')
                ])
            ]);
        }

        function renderError(err) {
            return BS.buildPanel({
                type: 'danger',
                title: 'Error',
                body: err.message
            });
        }

        function fetchData(objectRef) {
            // Show the stats plots
            var query = {
                assembly: {
                    _args: {
                        ref: objectRef
                    },
                    contig_ids: {},
                    contig_lengths: {},
                    contig_gc_content: {}
                }
            };
            return queryService.query(query)
                .then(function (result) {
                    var contigLengthValues = US.values(result.assembly.contig_lengths);
                    result.nx = utils.nx(contigLengthValues, US.range(1, 101, 1));
                    return result;
                });
        }

        function node(id) {
            return container.querySelector('[data-element="' + id + '"]');
        }

        function renderPlots(data) {
            var options = {
                markerColor: markerColor
            };
            AssemblyGCDistribution.render(node('contig-gc-hist'), data, options);
            AssemblyContigLengthDistribution.render(node('contig-lengths-hist'), data, options);
            AssemblyNxPercentage.render(node('nx-plot'), data, options);
            AssemblyGCLengthVsPercentage.render(node('contig-gc-vs-length'), data, options);
            AssemblyGCPercentageScatter.render(node('contig-gc-percent-scatter'), data, options);
            AssemblyContigLengthsScatter.render(node('contig-lengths-scatter'), data, options);
        }

        function attach(node) {
            return Promise.try(function () {
                hostNode = node;
                container = hostNode.appendChild(document.createElement('div'));
                container.innerHTML = layout();
            });
        }

        function start(params) {
            return Promise.try(function () {
                objectRef = params.objectRef;
                fetchData(objectRef)
                    .then(function (data) {
                        return renderPlots(data);
                    })
                    .catch(function (err) {
                        renderError(err);
                    });
            });
        }

        function stop() {
            return Promise.try(function () {});
        }

        function detach() {
            return Promise.try(function () {
                if (hostNode && container) {
                    hostNode.removeChild(container);
                }
            });
        }
        return {
            attach: attach,
            start: start,
            stop: stop,
            detach: detach
        };
    }

    return {
        make: function (config) {
            return factory(config);
        }
    };
});