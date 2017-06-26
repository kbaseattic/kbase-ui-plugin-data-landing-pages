define([
    'plotly'
], function (
    plotly
) {
    function render(node, input, options) {
        var layout = {
            title: '<b>Contig GC% Distribution</b>',
            fontsize: 24,
            xaxis: { title: '<b>GC%</b>' },
            yaxis: { title: '<b>Count</b>' }
        };
        var data = [{
            x: Object.keys(input.assembly.contig_gc_content).map(function (key) {
                return input.assembly.contig_gc_content[key] * 100.0;
            }),
            type: 'histogram',
            marker: {
                line: { width: 1, color: 'rgb(255,255,255)' },
                color: options.markerColor
            }
        }];
        node.innerHTML = '';
        plotly.plot(node, data, layout);
    }

    return {
        render: render
    };
});