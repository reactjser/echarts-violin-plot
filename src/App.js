import React, { Component, createRef } from 'react';
import echarts from 'echarts/lib/echarts';
import 'echarts/lib/chart/custom';
import 'echarts/lib/component/tooltip';
import 'echarts/extension/dataTool';

import data from './data.json';

const d3 = Object.assign(
  {},
  require('d3-shape'),
  require('d3-scale'),
  require('d3-array'),
  require('d3-color')
);

const columns = [...new Set(data.map(v => v.date))].sort((a, b) => a - b);
const dataSource = columns.map(date =>
  data.filter(item => item.date === date).map(item => item.value)
);

function kernelDensityEstimator(kernel, X) {
  return function(V) {
    return X.map(function(x) {
      return [
        x,
        d3.mean(V, function(v) {
          return kernel(x - v);
        })
      ];
    });
  };
}
function kernelEpanechnikov(k) {
  return function(v) {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}

class App extends Component {
  chartRef = createRef();

  draw = () => {
    const tooltipData = echarts.dataTool.prepareBoxplotData(dataSource);
    const { boxData } = tooltipData;

    // 基于准备好的dom，初始化echarts实例
    const myChart = echarts.init(this.chartRef.current);

    // 指定图表的配置项和数据
    const option = {
      grid: {
        top: '10%',
        left: '10%',
        right: '10%',
        bottom: '10%'
      },
      tooltip: {
        formatter: function(param) {
          return [
            columns[param.dataIndex] + ': ',
            'upper: ' + boxData[param.dataIndex][4],
            'Q3: ' + boxData[param.dataIndex][3],
            'median: ' + boxData[param.dataIndex][2],
            'Q1: ' + boxData[param.dataIndex][1],
            'lower: ' + boxData[param.dataIndex][0]
          ].join('<br/>');
        }
      },
      xAxis: {
        type: 'category',
        data: columns,
        boundaryGap: true,
        nameGap: 30,
        splitArea: {
          show: false
        },
        axisLabel: {
          color: '#999'
        },
        splitLine: {
          show: false
        },
        axisLine: {
          lineStyle: {
            color: ['#ccc']
          }
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        z: 2,
        type: 'value',
        // name: '(元/㎡)',
        nameTextStyle: {
          color: '#999',
          padding: [0, 30, 0, 0]
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          lineStyle: {
            color: ['#EEE']
          }
        },
        axisLabel: {
          color: '#999'
        }
      },
      series: [
        {
          type: 'custom',
          color: ['#B1D0FA'],
          name: 'violin plot',
          renderItem: (params, api) => {
            const categoryIndex = api.value(0);

            const min = Math.min(...dataSource[categoryIndex]);
            const max = Math.max(...dataSource[categoryIndex]);
            const liner = d3
              .scaleLinear()
              .domain([min - 50, max + 50])
              .ticks(20);
            let density = kernelDensityEstimator(kernelEpanechnikov(7), liner)(
              dataSource[categoryIndex]
            );

            const maxDens = Math.max(...density.map(v => v[1]));

            const points = density.map(v => {
              const [y, dens] = v;
              const point = api.coord([categoryIndex, y]);
              point[0] += (((api.size([0, 0])[0] / 2) * dens) / maxDens) * 0.85;
              return point;
            });

            const points2 = density.map(v => {
              const [y, dens] = v;
              const point = api.coord([categoryIndex, y]);
              point[0] -= (((api.size([0, 0])[0] / 2) * dens) / maxDens) * 0.85;
              return point;
            });

            const lineGenerator = d3.line().curve(d3.curveBasis);
            const pathData = lineGenerator(points);
            const pathData2 = lineGenerator(points2);

            return {
              z: 2,
              type: 'path',
              shape: {
                pathData: pathData + pathData2
              },
              style: api.style({
                fill: api.visual('color'),
                stroke: '#428EEE',
                lineWidth: 1
              }),
              styleEmphasis: api.style({
                fill: d3.color(api.visual('color')).darker(0.05),
                stroke: d3.color('#428EEE').darker(0.05),
                lineWidth: 2
              })
            };
          },
          encode: {
            x: 0,
            y: dataSource[
              d3.scan(dataSource, function(a, b) {
                return b.length - a.length;
              })
            ].map((v, i) => i + 1)
          },
          data: dataSource.map((v, i) => [i, ...v])
        }
      ]
    };

    // 使用刚指定的配置项和数据显示图表。
    myChart.setOption(option);
  };

  componentDidMount() {
    this.draw();
  }

  render() {
    return (
      <div
        className="chart"
        ref={this.chartRef}
        style={{ width: '600px', height: '400px' }}
      ></div>
    );
  }
}

export default App;
