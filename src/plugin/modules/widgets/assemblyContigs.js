define([
    'bluebird',
    'numeral',
    'knockout-plus',
    // 'kb_common/jsonRpc/dynamicServiceClient',
    '../queryService',
    'kb_common/html',

    '../components/table',
    'datatables_bootstrap'
], function (
    Promise,
    numeral,
    ko,
    //DynamicServiceClient,
    QueryService,
    html
) {
    'use strict';
    var t = html.tag,
        div = t('div');

    function factory(config) {
        var runtime = config.runtime;
        var container;
        var queryService = QueryService({
            runtime: runtime
        });

        //
        function fetchData(objectRef) {
            const contigIdQuery = {
                assembly: {
                    _args: {
                        ref: objectRef
                    },
                    contig_ids: {}
                }
            };
            return queryService.query(contigIdQuery)
                .then(data => {
                    debugger;
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
                    return queryService.query(query);
                });

            // var query = {
            //     assembly: {
            //         _args: {
            //             ref: objectRef
            //         },
            //         contig_lengths: {},
            //         contig_gc_content: {}
            //     }
            // };
            // return queryService.query(query);


            // var AssemblyClient = new DynamicServiceClient({
            //     url: runtime.config('services.service_wizard.url'),
            //     token: runtime.service('session').getAuthToken(),
            //     module: 'AssemblyAPI'
            // });

            // var dataCalls = [
            //     AssemblyClient.callFunc('get_contig_lengths', [objectRef, null]).then(function (result) {
            //         return result[0];
            //     }),
            //     AssemblyClient.callFunc('get_contig_gc_content', [objectRef, null]).then(function (result) {
            //         return result[0];
            //     })
            // ];
            // return Promise.all(dataCalls)
            //     .spread(function (contigLengths, contigGc) {
            //         return {
            //             contigLengths: contigLengths,
            //             contigGc: contigGc
            //         };
            //     });
        }

        function makeContigTable(data) {
            var rows = Object.keys(data.assembly.contig_lengths).map(function (id, index) {
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
                    }, {
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
                    }, {
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
            ko.applyBindings({
                table: tableData
            }, node);
        }

        // LIFECYCLE API

        function attach(node) {
            return Promise.try(function () {
                container = node;
                container.innerHTML = div([
                    div({
                        dataElement: 'summary'
                    }, div({
                        style: {
                            textAlign: 'center'
                        }
                    }, html.loading())),
                    div({
                        dataElement: 'contigs'
                    })
                ]);
            });
        }

        function start(params) {
            return fetchData(params.objectRef)
                .then(function (data) {
                    debugger;
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
