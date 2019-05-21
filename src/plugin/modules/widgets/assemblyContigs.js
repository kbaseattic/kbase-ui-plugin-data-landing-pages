define([
    'bluebird',
    'numeral',
    'knockout-plus',
    '../queryService',
    'kb_common/html',

    '../components/table',
    'datatables_bootstrap'
], function (Promise, numeral, ko, QueryService, html) {
    'use strict';
    var t = html.tag,
        div = t('div');

    function factory(config) {
        var runtime = config.runtime;
        var container;
        var queryService = QueryService({
            runtime: runtime
        });

        function fetchData(objectRef) {
            const contigIdQuery = {
                assembly: {
                    _args: {
                        ref: objectRef
                    },
                    contig_ids: {}
                }
            };
            return queryService.query(contigIdQuery).then(data => {
                const query = {
                    assembly: {
                        _args: {
                            ref: objectRef,
                            contig_id_list: data.assembly.contig_ids
                        },
                        contig_lengths: {},
                        contig_gc_content: {}
                    }
                };
                return queryService.query(query).then(data => {
                    return data;
                });
            });
        }

        function makeContigTable(data) {
            var rows = Object.keys(data.assembly.contig_lengths).map(function (id) {
                var contigLength = data.assembly.contig_lengths[id];
                var gc = data.assembly.contig_gc_content[id];
                // TODO: form the contig length to a number with commas

                return [id, contigLength, gc];
            });
            return {
                rows: rows,
                columns: [
                    //     {
                    //     name: 'row_id',
                    //     label: '#',
                    //     type: 'number',
                    //     width: '5%',
                    //     search: false,
                    //     style: {
                    //         textAlign: 'center'
                    //     },
                    //     columnStyle: {
                    //         textAlign: 'center'
                    //     }
                    // },
                    {
                        name: 'id',
                        label: 'Id',
                        type: 'string',
                        width: '30%',
                        search: true,
                        style: {
                            fontFamily: 'sans-serif'
                        }
                    },
                    {
                        name: 'contigLength',
                        label: 'Contig Length (bp)',
                        type: 'number',
                        width: '35%',
                        format: function (value) {
                            return numeral(value).format('0,0');
                        },
                        style: {
                            fontFamily: 'monospace',
                            textAlign: 'right'
                        },
                        columnStyle: {
                            textAlign: 'right'
                        }
                    },
                    {
                        name: 'gc',
                        label: 'GC (%)',
                        type: 'number',
                        width: '30%',
                        format: function (value) {
                            return (value * 100).toFixed(2);
                        },
                        style: {
                            fontFamily: 'monospace',
                            textAlign: 'right'
                        },
                        columnStyle: {
                            textAlign: 'right'
                        }
                    }
                ]
            };
        }

        function renderTable(tableData) {
            var node = container.querySelector('[data-element="summary"]');
            node.innerHTML = div({
                dataBind: {
                    component: {
                        name: '"table-widget"',
                        params: {
                            table: 'table',
                            showRowNumber: true
                        }
                    }
                }
            });
            ko.applyBindings(
                {
                    table: tableData
                },
                node
            );
        }

        // LIFECYCLE API

        function attach(node) {
            return Promise.try(function () {
                container = node;
                container.innerHTML = div([
                    div(
                        {
                            dataElement: 'summary'
                        },
                        div(
                            {
                                style: {
                                    textAlign: 'center'
                                }
                            },
                            html.loading()
                        )
                    ),
                    div({
                        dataElement: 'contigs'
                    })
                ]);
            });
        }

        function start(params) {
            return fetchData(params.objectRef).then(function (data) {
                var table = makeContigTable(data);
                renderTable(table);
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
