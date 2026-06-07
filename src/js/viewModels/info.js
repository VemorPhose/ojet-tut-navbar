define([
  'knockout',
  '../accUtils',
  '../data/laptopDataset',
  'ojs/ojarraydataprovider',
  'ojs/ojknockout',
  'ojs/ojlistview',
  'ojs/ojcollapsible'
], function(ko, accUtils, dataset, ArrayDataProvider) {
  'use strict';

  function InfoViewModel() {
    this.datasetFactsDP = new ArrayDataProvider([
      { id: 'rows', label: 'Rows', value: dataset.summary.total.toLocaleString('en-IN') },
      { id: 'companies', label: 'Companies', value: dataset.summary.companyCount },
      { id: 'types', label: 'Laptop types', value: dataset.summary.typeCount },
      { id: 'systems', label: 'Operating systems', value: dataset.summary.osCount },
      { id: 'price', label: 'Average price', value: dataset.formatCurrencyShort(dataset.summary.avgPrice) },
      { id: 'storage', label: 'Largest parsed storage', value: Math.round(dataset.summary.maxStorage) + ' GB' }
    ], { keyAttributes: 'id' });

    this.axisFactsDP = new ArrayDataProvider([
      { id: 'performance', label: 'Performance', value: 'RAM / log price / CPU GHz / Type color' },
      { id: 'mobility', label: 'Mobility', value: 'Weight / log price / Screen inches / Type color' },
      { id: 'display', label: 'Display', value: 'Pixel density / log price / log storage / Storage color' }
    ], { keyAttributes: 'id' });

    this.connected = function() {
      accUtils.announce('Method page loaded.');
      document.title = 'Laptop Atlas - Method';
    };

    this.disconnected = function() {};
    this.transitionCompleted = function() {};
  }

  return InfoViewModel;
});
