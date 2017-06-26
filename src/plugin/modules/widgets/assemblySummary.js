define([
    'bluebird',
    'kb_common/html',
    'kb_common/bootstrapUtils',
    '../queryService',

    'datatables_bootstrap'
], function (
    Promise,
    html,
    BS,
    QueryService
) {
    'use strict';
    var t = html.tag,
        div = t('div'),
        span = t('span'),
        table = t('table'),
        tr = t('tr'),
        td = t('td');

    function factory(config) {
        var runtime = config.runtime;
        var hostNode, container;
        var queryService = QueryService({
            runtime: runtime
        });

        function fetchData(objectRef) {
            var querySpec = {
                assembly: {
                    _args: {
                        ref: objectRef
                    },
                    stats: {
                        num_contigs: {},
                        gc_content: {},
                        dna_size: {}
                    }
                },
                workspace: {
                    _args: {
                        ref: objectRef
                    },
                    data: {
                        external_source: {},
                        external_source_id: {},
                        external_source_origination_date: {}
                    }
                }
            };
            return queryService.query(querySpec);
        }

        function renderSummaryTable(data) {
            container.innerHTML = table({
                class: 'table table-striped table-bordered table-hover',
                style: {
                    margin: 'auto auto'
                }
            }, [
                tr([
                    td('Number of Contigs'),
                    td(data.assembly.stats.num_contigs)
                ]),
                tr([
                    td('Total GC Content'),
                    td(String((data.assembly.stats.gc_content * 100).toFixed(2)) + '%')
                ]),
                tr([
                    td('Total Length'),
                    td(data.assembly.stats.dna_size + ' bp')
                ]),
                tr([
                    td('External Source'),
                    td(data.workspace.external_source || na())
                ]),
                tr([
                    td('External Source ID'),
                    td(data.workspace.external_source_id || na())
                ]),
                tr([
                    td('Source Origination Date'),
                    td(data.workspace.external_source_origination_date || na())
                ]),
            ]);
        }

        function na() {
            return span({
                style: {
                    fontStyle: 'italic',
                    color: 'gray'
                }
            }, 'n/a');
        }

        function renderError(err) {
            return BS.buildPanel({
                type: 'danger',
                title: 'Error',
                body: err.message
            });
        }

        // WIDGET/SERVICE API

        function attach(node) {
            return Promise.try(function () {
                hostNode = node;
                container = hostNode.appendChild(document.createElement('div'));
            });
        }

        function start(params) {
            container.innerHTML = div({
                style: {
                    textAlign: 'center'
                }
            }, html.loading());
            return fetchData(params.objectRef)
                .then(function (data) {
                    renderSummaryTable(data);
                })
                .catch(function (err) {
                    renderError(err);
                });
        }

        function stop() {
            return Promise.try(function () {
                return null;
            });
        }

        function detach() {
            return Promise.try(function () {
                return null;
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