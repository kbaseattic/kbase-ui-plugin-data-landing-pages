define([
    'plotly'
], function (
    plotly
) {
    function render(node, input, options) {
        var layout = {
            title: '<b>Contig GC%</b>',
            fontsize: 24,
            xaxis: {
                title: '<b>Contig Length (bp)</b>'
            },
            yaxis: {
                zeroline: true,
                title: '<b>Contig GC %</b>'
            }
        };
        var lengthPairs = Object.keys(input.assembly.contig_lengths).map(function (key) {
            return [key, input.assembly.contig_lengths[key]];
        });

        var data = [{
            x: lengthPairs.map(function (p) { return p[1]; }),
            y: lengthPairs.map(function (p) { return input.assembly.contig_gc_content[p[0]] * 100.0; }),
            mode: 'markers',
            type: 'scatter',
            marker: { color: options.markerColor },
            hoverinfo: 'x+y'
        }];
        node.innerHTML = '';
        plotly.plot(node, data, layout);
    }

    return {
        render: render
    };
});