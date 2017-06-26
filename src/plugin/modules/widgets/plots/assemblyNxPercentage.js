define([
    'plotly'
], function (
    plotly
) {
    function intcmp(a, b) {
        if (a < b) {
            return -1;
        } else if (a > b) {
            return 1;
        } else {
            return 0;
        }
    }

    function range(start, end, step) {
        var result = [];
        for (var i = start; i <= end; i += step) {
            result.push(i);
        }
        return result;
    }

    function values(object) {
        return Object.keys(object).map(function (key) {
            return object[key];
        });
    }

    function render(node, input, options) {
        var nxKeys = Object.keys(input.nx).map(function (key) {
            return key * 1;
        });
        var nxValues = values(input.nx);
        var lengthPairs = Object.keys(input.assembly.contig_lengths).map(function (key) {
            return [key, input.assembly.contig_lengths[key]];
        });

        nxKeys.sort(intcmp);

        // Sort length pairs by second element (the length)
        lengthPairs.sort(function (p1, p2) {
            return intcmp(p1[1], p2[1]);
        });

        var layout = {
            title: '<b>N(x) Length</b>',
            fontsize: 24,
            xaxis: {
                title: '<b>Nx percentage</b>',
                tickmode: 'array',
                tickvals: range(0, 110, 10),
                showgrid: true
            },
            yaxis: { title: '<b>Contig Length (bp)</b>' }
        };

        var data = [{
            type: 'scatter',
            mode: 'lines',
            x: nxKeys,
            y: nxValues,
            marker: { color: options.markerColor },
            showlegend: false,
            hoverinfo: 'x+y'
        }, {
            type: 'scatter',
            mode: 'lines',
            x: [50, 50],
            y: [0, Math.max.apply(null, nxValues)],
            line: { dash: 5, color: 'red' },
            showlegend: false
        }];
        node.innerHTML = '';
        plotly.plot(node, data, layout);
    }

    return {
        render: render
    };
});