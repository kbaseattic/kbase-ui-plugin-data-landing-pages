define([
    'bluebird',
    'kb_service/client/workspace',
    'kb_common/jsonRpc/dynamicServiceClient',
], function (
    Promise,
    Workspace,
    DynamicServiceClient
) {
    function QueryService(config) {
        var runtime = config.runtime;

        function queryDynamicService(subject, args, output) {
            var subjects = {
                assembly: {
                    module: 'AssemblyAPI',
                    fields: {
                        stats: {
                            method: 'get_stats',
                            args: ['ref']
                        },
                        contig_ids: {
                            method: 'get_contig_ids',
                            args: ['ref']
                        },
                        contig_lengths: {
                            method: 'get_contig_lengths',
                            args: ['ref', 'contig_id_list']
                        },
                        contig_gc_content: {
                            method: 'get_contig_gc_content',
                            args: ['ref', 'contig_id_list']
                        }
                    }
                }
            };

            // Get the primary api via the top level field, or subject.
            var apiSpec = subjects[subject];
            if (!apiSpec) {
                throw new Error('Could not map subject ' + subject + ' to module');
            }

            // Next we must map each output field to the associated api call.
            var methods = Object.keys(output).map(function (outputKey) {
                var method = apiSpec.fields[outputKey];
                if (!method) {
                    throw new Error('No method mapping for output property ' + outputKey);
                }
                // for now we just take the top level args, but we need to merge the top
                // level with the field args.
                // we don't know how this will shake out with other dynamic services, though.
                // i have a feeling the data api is special.
                var positionalArgs = method.args.map(function (argKey) {
                    // NB arguments not provided default to null.
                    return args[argKey] || null;
                });

                // We also require that subfields be specified as well. This should be recursive,
                // that is supoprt objects, for the the moment only the top level property.
                var outputFields = output[outputKey];
                return {
                    outputKey: outputKey,
                    method: method.method,
                    args: positionalArgs,
                    outputFields: outputFields
                };
            });

            var client = new DynamicServiceClient({
                url: runtime.config('services.service_wizard.url'),
                token: runtime.service('session').getAuthToken(),
                module: apiSpec.module
            });

            return Promise.all(methods.map(function (method) {
                return client.callFunc(method.method, method.args).then(function (results) {
                    var result = results[0];
                    if (result instanceof Array) {
                        var range = method.outputFields._range;
                        if (range) {
                            // do the range
                            if (range === 'all') {
                                return result;
                            }
                            // TODO: return a range of results...
                            console.error('range is not yet supported.');
                            throw new Error('Range is not yet supported for array fields');
                        } else {
                            // just return all.
                            return result;
                        }
                    } else {
                        var fields = Object.keys(method.outputFields);
                        if (fields.length === 0) {
                            return result;
                        }
                        var output = {};
                        // we need a way to just get all props off of a map.
                        // Some maps are not actually named fields, but maps of values -> value.
                        // So the convention is that if no fields are provided, just return all available.
                        fields.forEach(function (fieldName) {
                            // var field = method.outputFields[fieldName];
                            output[fieldName] = result[fieldName] || null;
                        });
                        return output;
                    }
                }).catch(function (err) {
                    console.error('Error running dynamic service query', subject, args, output, err);
                    throw new Error('Error running dynamic service query for ' + subject + ': ' + err.message);
                });
            })).then(function (results) {
                var queryResults = {};
                results.forEach(function (result, index) {
                    queryResults[methods[index].outputKey] = result;
                });
                return queryResults;
            });
        }

        function queryWorkspace(args, output) {
            // Determine the method to use, based on the arguments provided
            // Also determine the method based on the output required.
            // May need multiple calls to handle this
            var arg;
            var method;
            var formatter;
            if (args.ref) {
                // we will be getting a single object
                if (output.data) {
                    // we will be getting a subset of data -- there is only one way to do this.
                    method = 'get_object_subset';
                    // nb the get_object_subset allows multiple queries to be packed together,
                    //    we just handle one here for now.
                    arg = [{
                        ref: args.ref,
                        included: Object.keys(output.data)
                    }];
                    formatter = function (result) {
                        return result[0].data;
                    };
                }
            }

            if (!method) {
                console.error('workspace query', args, output);
                throw new Error('There is no way to satisfy this workspace query');
            }

            var ws = new Workspace(runtime.config('services.workspace.url'), {
                token: runtime.service('session').getAuthToken()
            });

            // TODO: utilize the generic rpc method?
            return ws[method](arg).then(formatter)
                .catch(function (err) {
                    console.error('Error running workspace query', args, output, err);
                    throw new Error('Error running workspace query');
                });
        }

        function runQuery(subject, args, output) {
            switch (subject) {
            case 'workspace':
                return queryWorkspace(args, output);
            default:
                return queryDynamicService(subject, args, output);
            }
        }

        function query(spec) {
            // Supports multiple query subjects
            var queryKeys = Object.keys(spec);
            return Promise.all(queryKeys.map(function (key) {
                var oneSpec = spec[key];
                var args = oneSpec._args;
                delete oneSpec._args;
                return runQuery(key, args, oneSpec);
            })).then(function (results) {
                var queryResult = {};
                results.forEach(function (result, index) {
                    var queryKey = queryKeys[index];
                    queryResult[queryKey] = result;
                });
                return queryResult;
            });
        }

        return {
            query: query
        };
    }
    return QueryService;
});