define([
  'knockout',
  '../accUtils',
  '../data/laptopDataset',
  'ojs/ojarraydataprovider',
  'ojs/ojknockout',
  'ojs/ojchart',
  'ojs/ojlistview'
], function(ko, accUtils, dataset, ArrayDataProvider) {
  'use strict';

  function InsightsViewModel() {
    const rows = dataset.rows;
    const typePrice = dataset.rankedMedian(rows, 'typeName', 'price', 6, 1);
    const gpuPrice = dataset.rankedMedian(rows, 'gpuBrand', 'price', 5, 10);
    const osPrice = dataset.rankedMedian(rows, 'osFamily', 'price', 6, 5);
    const ramPrice = dataset.ramPriceStats(rows);
    const storageClassPrice = dataset.rankedMedian(rows, 'storageClass', 'price', 5, 20);
    const storagePremium = dataset.storagePremiumStats(rows);
    const typeStats = dataset.rankedMedian(rows, 'typeName', 'price', 10, 1);

    this.typePriceGroups = typePrice.map((item) => item.group);
    this.typePriceSeries = dataset.groupedBarSeries(typePrice, 'Median price');
    this.gpuPriceGroups = gpuPrice.map((item) => item.group);
    this.gpuPriceSeries = dataset.groupedBarSeries(gpuPrice, 'Median price');
    this.osPriceGroups = osPrice.map((item) => item.group);
    this.osPriceSeries = dataset.groupedBarSeries(osPrice, 'Median price');
    this.storagePremiumGroups = storagePremium.groups;
    this.storagePremiumSeries = storagePremium.series;
    this.chartPlotArea = dataset.chartPlotArea;
    this.chartStyleDefaults = dataset.chartStyleDefaults;
    this.chartXAxis = dataset.chartXAxis;
    this.chartYAxis = dataset.chartYAxis;

    this.insightListDP = new ArrayDataProvider([
      {
        id: 'type-premium',
        label: 'Type premium',
        value: valueFor(typeStats, 'Workstation'),
        note: 'Workstation and gaming models sit at the top of the form-factor price ladder, so the site treats type as a primary segmentation color.'
      },
      {
        id: 'ram-step',
        label: 'RAM step',
        value: valueFor(ramPrice, '16 GB'),
        note: 'The RAM chart uses medians because 16 GB and higher tiers are mixed with several extreme gaming and workstation outliers.'
      },
      {
        id: 'gpu-premium',
        label: 'GPU signal',
        value: valueFor(gpuPrice, 'Nvidia'),
        note: 'Dedicated GPU groups separate performance laptops from integrated graphics notebooks more clearly than raw model count.'
      },
      {
        id: 'storage-premium',
        label: 'Storage class',
        value: valueFor(storageClassPrice, 'SSD'),
        note: 'Storage is compared within laptop type so SSD, HDD, and hybrid machines are not flattened into one misleading aggregate.'
      }
    ], { keyAttributes: 'id' });

    this.connected = function() {
      accUtils.announce('Insights page loaded.');
      document.title = 'Laptop Atlas - Insights';
    };

    this.disconnected = function() {};
    this.transitionCompleted = function() {};
  }

  function valueFor(stats, group) {
    const stat = stats.find((item) => item.group === group);
    return stat ? dataset.formatCurrencyShort(stat.value) : 'n/a';
  }

  return InsightsViewModel;
});
